import fs from 'node:fs/promises';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { detectManagedFileState, parseManagedFileHeader } from './managed-files.js';
import { resolveRepoPath, resolveTargetPath } from './paths.js';
import { assertSupportedInstallTarget } from './targets.js';

export async function installTarget(repoRoot, agent, options = {}) {
  const prodifyDir = resolveRepoPath(repoRoot, '.prodify');
  if (!(await pathExists(prodifyDir))) {
    throw new ProdifyError('Canonical .prodify/ directory is missing.', {
      code: 'PRODIFY_MISSING'
    });
  }

  const targetMetadata = assertSupportedInstallTarget(agent);
  const targetPath = resolveTargetPath(repoRoot, agent);
  const nextContent = await targetMetadata.generator(repoRoot);

  if (await pathExists(targetPath)) {
    const existingContent = await fs.readFile(targetPath, 'utf8');
    const managedHeader = parseManagedFileHeader(existingContent);

    if (!managedHeader) {
      throw new ProdifyError(`Target file already exists and is not Prodify-managed: ${targetPath}`, {
        code: 'UNMANAGED_TARGET_EXISTS'
      });
    }

    const state = detectManagedFileState(existingContent, nextContent);
    if (state.state === 'conflict' && !options.force) {
      throw new ProdifyError(`Managed target has manual edits and is blocked: ${targetPath}. Re-run with --force to overwrite.`, {
        code: 'MANAGED_CONFLICT'
      });
    }
  }

  await writeFileEnsuringDir(targetPath, nextContent);

  return {
    agent,
    targetPath,
    changed: true,
    status: targetMetadata.status
  };
}
