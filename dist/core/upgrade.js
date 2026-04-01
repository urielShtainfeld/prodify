import fs from 'node:fs/promises';
import { writeFileEnsuringDir } from './fs.js';
import { USER_OWNED_CANONICAL_PATHS, USER_OWNED_CANONICAL_PREFIXES, resolveRepoPath } from './paths.js';
import { loadDefaultPreset } from '../presets/loader.js';
import { readRuntimeState, createInitialRuntimeState, normalizeRuntimeState, serializeRuntimeState } from './state.js';
import { inspectVersionStatus } from './version-checks.js';
import { synchronizeRuntimeContracts } from '../contracts/compiler.js';
export async function updateProdifySetup(repoRoot) {
    const preset = await loadDefaultPreset();
    const versionStatus = await inspectVersionStatus(repoRoot, preset.metadata);
    const writtenCanonical = [];
    const preservedCanonical = [];
    for (const entry of preset.entries) {
        const targetPath = resolveRepoPath(repoRoot, entry.relativePath);
        const isUserOwned = USER_OWNED_CANONICAL_PATHS.includes(entry.relativePath);
        const isUserOwnedByPrefix = USER_OWNED_CANONICAL_PREFIXES.some((prefix) => entry.relativePath.startsWith(prefix));
        if (isUserOwned || isUserOwnedByPrefix) {
            try {
                await fs.access(targetPath);
                preservedCanonical.push(entry.relativePath);
                continue;
            }
            catch {
                // fall through and create the missing file
            }
        }
        if (entry.relativePath === '.prodify/state.json') {
            let nextState;
            try {
                const existingState = await readRuntimeState(repoRoot, {
                    presetMetadata: preset.metadata
                });
                nextState = normalizeRuntimeState(existingState, {
                    presetMetadata: preset.metadata
                });
            }
            catch {
                nextState = createInitialRuntimeState({
                    presetMetadata: preset.metadata
                });
            }
            await writeFileEnsuringDir(targetPath, serializeRuntimeState(nextState));
            writtenCanonical.push(entry.relativePath);
            continue;
        }
        await writeFileEnsuringDir(targetPath, entry.content);
        writtenCanonical.push(entry.relativePath);
    }
    const compiledContracts = await synchronizeRuntimeContracts(repoRoot);
    return {
        versionStatus: versionStatus.status,
        schemaMigrationRequired: versionStatus.schemaMigrationRequired,
        writtenCanonicalCount: writtenCanonical.length,
        preservedCanonicalCount: preservedCanonical.length,
        compiledContractCount: compiledContracts.length
    };
}
