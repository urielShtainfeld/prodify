import fs from 'node:fs/promises';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { parseManagedFileHeader } from './managed-files.js';
import { resolveRepoPath, resolveTargetPath } from './paths.js';
import { assertSupportedInstallTarget } from './targets.js';

export async function installTarget(repoRoot, agent) {
  const prodifyDir = resolveRepoPath(repoRoot, '.prodify');
  if (!(await pathExists(prodifyDir))) {
    throw new ProdifyError('Canonical .prodify/ directory is missing.', {
      code: 'PRODIFY_MISSING'
    });
  }

  const { generator } = assertSupportedInstallTarget(agent);
  const targetPath = resolveTargetPath(repoRoot, agent);
  const nextContent = await generator(repoRoot);

  if (await pathExists(targetPath)) {
    const existingContent = await fs.readFile(targetPath, 'utf8');
    const managedHeader = parseManagedFileHeader(existingContent);

    if (!managedHeader) {
      throw new ProdifyError(`Target file already exists and is not Prodify-managed: ${targetPath}`, {
        code: 'UNMANAGED_TARGET_EXISTS'
      });
    }
  }

  await writeFileEnsuringDir(targetPath, nextContent);

  return {
    agent,
    targetPath,
    changed: true
  };
}
