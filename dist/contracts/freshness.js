import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { compileContractsFromSourceDir, loadCompiledContract, serializeCompiledContract } from './compiler.js';
import { CONTRACT_STAGE_NAMES } from './source-schema.js';
import { pathExists, writeFileEnsuringDir } from '../core/fs.js';
import { resolveCanonicalPath } from '../core/paths.js';
const CONTRACT_MANIFEST_SCHEMA_VERSION = '1';
function createHash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function serializeJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function asRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
function normalizeInventory(raw) {
    const record = asRecord(raw);
    const normalizeStages = (value) => Array.isArray(value)
        ? value.filter((entry) => typeof entry === 'string' && CONTRACT_STAGE_NAMES.includes(entry))
            .sort((left, right) => left.localeCompare(right))
        : [];
    const normalizeStrings = (value) => Array.isArray(value)
        ? value.filter((entry) => typeof entry === 'string').sort((left, right) => left.localeCompare(right))
        : [];
    if (typeof record.ok !== 'boolean') {
        return null;
    }
    return {
        ok: record.ok,
        sourceCount: typeof record.sourceCount === 'number' ? record.sourceCount : 0,
        compiledCount: typeof record.compiledCount === 'number' ? record.compiledCount : 0,
        staleStages: normalizeStages(record.staleStages),
        missingCompiledStages: normalizeStages(record.missingCompiledStages),
        missingSourceStages: normalizeStages(record.missingSourceStages),
        invalidStages: normalizeStrings(record.invalidStages)
    };
}
async function readContractManifestCache(repoRoot, expectedSourceHashes, expectedCompiledHashes) {
    const manifestPath = resolveCanonicalPath(repoRoot, '.prodify/contracts/manifest.json');
    if (!(await pathExists(manifestPath))) {
        return null;
    }
    try {
        const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        if (parsed.schema_version !== CONTRACT_MANIFEST_SCHEMA_VERSION) {
            return null;
        }
        const sourceHashes = asRecord(parsed.source_hashes);
        const compiledHashes = asRecord(parsed.compiled_hashes);
        if (JSON.stringify(sourceHashes) !== JSON.stringify(expectedSourceHashes)) {
            return null;
        }
        if (JSON.stringify(compiledHashes) !== JSON.stringify(expectedCompiledHashes)) {
            return null;
        }
        return normalizeInventory(parsed.inventory);
    }
    catch {
        return null;
    }
}
async function collectContractHashes(repoRoot) {
    const sourceHashes = {};
    const compiledHashes = {};
    for (const stage of CONTRACT_STAGE_NAMES) {
        const sourcePath = resolveCanonicalPath(repoRoot, `.prodify/contracts-src/${stage}.contract.md`);
        const compiledPath = resolveCanonicalPath(repoRoot, `.prodify/contracts/${stage}.contract.json`);
        sourceHashes[stage] = await pathExists(sourcePath)
            ? createHash((await fs.readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n'))
            : 'missing';
        compiledHashes[stage] = await pathExists(compiledPath)
            ? createHash((await fs.readFile(compiledPath, 'utf8')).replace(/\r\n/g, '\n'))
            : 'missing';
    }
    return {
        sourceHashes,
        compiledHashes
    };
}
async function writeContractManifestCache(repoRoot, { sourceHashes, compiledHashes, inventory }) {
    const manifestPath = resolveCanonicalPath(repoRoot, '.prodify/contracts/manifest.json');
    await writeFileEnsuringDir(manifestPath, serializeJson({
        schema_version: CONTRACT_MANIFEST_SCHEMA_VERSION,
        source_hashes: sourceHashes,
        compiled_hashes: compiledHashes,
        inventory
    }));
}
export async function inspectCompiledContracts(repoRoot, options = {}) {
    const { sourceHashes, compiledHashes } = await collectContractHashes(repoRoot);
    if (!options.refresh) {
        const cached = await readContractManifestCache(repoRoot, sourceHashes, compiledHashes);
        if (cached) {
            return cached;
        }
    }
    const inventory = {
        ok: true,
        sourceCount: 0,
        compiledCount: 0,
        staleStages: [],
        missingCompiledStages: [],
        missingSourceStages: [],
        invalidStages: []
    };
    let expectedContracts = [];
    try {
        expectedContracts = await compileContractsFromSourceDir(repoRoot);
        inventory.sourceCount = expectedContracts.length;
    }
    catch (error) {
        inventory.ok = false;
        inventory.invalidStages.push(error instanceof Error ? error.message : String(error));
    }
    const expectedByStage = new Map();
    for (const contract of expectedContracts) {
        expectedByStage.set(contract.stage, contract);
    }
    for (const stage of CONTRACT_STAGE_NAMES) {
        const expected = expectedByStage.get(stage);
        if (!expected) {
            inventory.ok = false;
            inventory.missingSourceStages.push(stage);
            continue;
        }
        try {
            const compiled = await loadCompiledContract(repoRoot, stage);
            inventory.compiledCount += 1;
            if (serializeCompiledContract(compiled) !== serializeCompiledContract(expected)) {
                inventory.ok = false;
                inventory.staleStages.push(stage);
            }
        }
        catch (error) {
            inventory.ok = false;
            inventory.missingCompiledStages.push(stage);
            inventory.invalidStages.push(error instanceof Error ? error.message : String(error));
        }
    }
    inventory.staleStages.sort((left, right) => left.localeCompare(right));
    inventory.missingCompiledStages.sort((left, right) => left.localeCompare(right));
    inventory.missingSourceStages.sort((left, right) => left.localeCompare(right));
    inventory.invalidStages.sort((left, right) => left.localeCompare(right));
    await writeContractManifestCache(repoRoot, {
        sourceHashes,
        compiledHashes,
        inventory
    });
    return inventory;
}
