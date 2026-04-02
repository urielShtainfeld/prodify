import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { listFilesRecursive, pathExists, writeFileEnsuringDir } from '../core/fs.js';
import { normalizeRepoRelativePath, resolveCanonicalPath } from '../core/paths.js';
import { ProdifyError } from '../core/errors.js';
import { parseContractSource } from './parser.js';
import { validateCompiledContractShape } from './compiled-schema.js';
import { CONTRACT_STAGE_NAMES, normalizeSourceContractDocument } from './source-schema.js';
function createSourceHash(source) {
    return crypto.createHash('sha256').update(source).digest('hex');
}
export function serializeCompiledContract(contract) {
    return `${JSON.stringify(contract, null, 2)}\n`;
}
export function compileContractSource(options) {
    const { markdown, sourcePath } = options;
    const document = parseContractSource(markdown);
    return normalizeSourceContractDocument({
        document,
        sourcePath,
        sourceHash: createSourceHash(markdown.replace(/\r\n/g, '\n'))
    });
}
export async function compileContractsFromSourceDir(repoRoot) {
    const sourceDir = resolveCanonicalPath(repoRoot, '.prodify/contracts-src');
    if (!(await pathExists(sourceDir))) {
        throw new ProdifyError('Contract source directory is missing: .prodify/contracts-src', {
            code: 'CONTRACT_SOURCE_MISSING'
        });
    }
    const files = (await listFilesRecursive(sourceDir))
        .filter((file) => file.relativePath.endsWith('.contract.md'))
        .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const contracts = [];
    for (const file of files) {
        const sourcePath = `.prodify/contracts-src/${normalizeRepoRelativePath(file.relativePath)}`;
        contracts.push(compileContractSource({
            markdown: await fs.readFile(file.fullPath, 'utf8'),
            sourcePath
        }));
    }
    const seenStages = new Set();
    for (const contract of contracts) {
        if (seenStages.has(contract.stage)) {
            throw new ProdifyError(`Duplicate contract stage detected: ${contract.stage}.`, {
                code: 'CONTRACT_SCHEMA_INVALID'
            });
        }
        seenStages.add(contract.stage);
    }
    return contracts.sort((left, right) => left.stage.localeCompare(right.stage));
}
export async function synchronizeRuntimeContracts(repoRoot) {
    const contracts = await compileContractsFromSourceDir(repoRoot);
    const compiledDir = resolveCanonicalPath(repoRoot, '.prodify/contracts');
    await writeFileEnsuringDir(resolveCanonicalPath(repoRoot, '.prodify/contracts/README.md'), '# Compiled Contracts\n\nThis directory contains deterministic runtime-only JSON contracts generated from `.prodify/contracts-src/`.\n');
    for (const contract of contracts) {
        await writeFileEnsuringDir(resolveCanonicalPath(repoRoot, `.prodify/contracts/${contract.stage}.contract.json`), serializeCompiledContract(contract));
    }
    const existingFiles = (await pathExists(compiledDir))
        ? await listFilesRecursive(compiledDir)
        : [];
    for (const file of existingFiles) {
        if (!file.relativePath.endsWith('.contract.json')) {
            continue;
        }
        const stage = file.relativePath.replace(/\.contract\.json$/, '');
        if (!CONTRACT_STAGE_NAMES.includes(stage)) {
            await fs.rm(file.fullPath, { force: true });
        }
    }
    return contracts;
}
export async function loadCompiledContract(repoRoot, stage) {
    const contractPath = resolveCanonicalPath(repoRoot, `.prodify/contracts/${stage}.contract.json`);
    if (!(await pathExists(contractPath))) {
        throw new ProdifyError(`Compiled contract is missing for stage "${stage}".`, {
            code: 'COMPILED_CONTRACT_MISSING'
        });
    }
    const parsed = JSON.parse(await fs.readFile(contractPath, 'utf8'));
    return validateCompiledContractShape(parsed);
}
