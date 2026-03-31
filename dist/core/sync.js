import fs from 'node:fs/promises';
import { ProdifyError } from './errors.js';
import { detectManagedFileState, parseManagedFileHeader } from './managed-files.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { resolveTargetPath } from './paths.js';
import { getLegacyTarget, listLegacyTargets } from './targets.js';
export async function syncManagedTargets(repoRoot, options = {}) {
    const requestedAgent = options.agent ?? null;
    const force = options.force ?? false;
    const createMissing = options.createMissing ?? Boolean(requestedAgent);
    const requestedTarget = requestedAgent ? getLegacyTarget(requestedAgent) : null;
    if (requestedAgent && !requestedTarget) {
        throw new ProdifyError(`Unknown target agent: ${requestedAgent}`, {
            code: 'UNKNOWN_TARGET'
        });
    }
    const agents = requestedAgent
        ? (requestedTarget ? [requestedTarget] : [])
        : listLegacyTargets();
    const results = [];
    for (const target of agents) {
        const agent = target.agent;
        const targetPath = resolveTargetPath(repoRoot, agent);
        if (!targetPath) {
            continue;
        }
        if (!target.enabled || !target.generator) {
            results.push({
                agent,
                targetPath,
                status: 'not-enabled'
            });
            continue;
        }
        const expectedContent = await target.generator(repoRoot);
        if (!(await pathExists(targetPath))) {
            if (createMissing) {
                await writeFileEnsuringDir(targetPath, expectedContent);
                results.push({ agent, targetPath, status: 'updated' });
            }
            continue;
        }
        const existingContent = await fs.readFile(targetPath, 'utf8');
        const managedHeader = parseManagedFileHeader(existingContent);
        if (!managedHeader || managedHeader.targetAgent !== agent) {
            results.push({ agent, targetPath, status: 'skipped-unmanaged' });
            continue;
        }
        const state = detectManagedFileState(existingContent, expectedContent);
        if (state.state === 'unchanged') {
            results.push({ agent, targetPath, status: 'unchanged' });
            continue;
        }
        if (state.state === 'conflict' && !force) {
            results.push({ agent, targetPath, status: 'blocked' });
            continue;
        }
        await writeFileEnsuringDir(targetPath, expectedContent);
        results.push({ agent, targetPath, status: 'updated' });
    }
    results.sort((left, right) => left.agent.localeCompare(right.agent));
    return results;
}
