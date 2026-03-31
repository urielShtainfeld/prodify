import fs from 'node:fs/promises';

import { parseManagedFileHeader } from './managed-files.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { KNOWN_TARGETS, resolveTargetPath } from './paths.js';
import { getEnabledGenerator } from './targets.js';

export async function syncManagedTargets(repoRoot, options = {}) {
  const requestedAgent = options.agent ?? null;
  const agents = requestedAgent ? [requestedAgent] : KNOWN_TARGETS;
  const results = [];

  for (const agent of agents) {
    const generator = getEnabledGenerator(agent);
    if (!generator) {
      continue;
    }

    const targetPath = resolveTargetPath(repoRoot, agent);
    if (!(await pathExists(targetPath))) {
      if (requestedAgent) {
        const expectedContent = await generator(repoRoot);
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

    const expectedContent = await generator(repoRoot);
    if (existingContent === expectedContent) {
      results.push({ agent, targetPath, status: 'unchanged' });
      continue;
    }

    await writeFileEnsuringDir(targetPath, expectedContent);
    results.push({ agent, targetPath, status: 'updated' });
  }

  return results;
}
