import fs from 'node:fs/promises';
import path from 'node:path';

import { ProdifyError } from './errors.js';

interface ResolveRepoRootOptions {
  cwd?: string;
  repoRoot?: string;
  allowBootstrap?: boolean;
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    return (await fs.stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

async function directoryHas(directory: string, childName: string): Promise<boolean> {
  return isDirectory(path.join(directory, childName));
}

async function searchUpwards(startDir: string, predicate: (candidate: string) => Promise<boolean>): Promise<string | null> {
  let current = path.resolve(startDir);

  while (true) {
    if (await predicate(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export async function resolveRepoRoot(options: ResolveRepoRootOptions = {}): Promise<string> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const explicitRepo = options.repoRoot ? path.resolve(options.repoRoot) : null;
  const allowBootstrap = options.allowBootstrap ?? false;

  if (explicitRepo) {
    const hasProdify = await directoryHas(explicitRepo, '.prodify');
    const hasGit = await directoryHas(explicitRepo, '.git');

    if (!hasProdify && !(allowBootstrap && hasGit)) {
      throw new ProdifyError(`Could not verify repository root at ${explicitRepo}.`, {
        code: 'REPO_ROOT_NOT_FOUND'
      });
    }

    return explicitRepo;
  }

  const prodifyRoot = await searchUpwards(cwd, async (candidate) => directoryHas(candidate, '.prodify'));
  if (prodifyRoot) {
    return prodifyRoot;
  }

  if (allowBootstrap) {
    const gitRoot = await searchUpwards(cwd, async (candidate) => directoryHas(candidate, '.git'));
    if (gitRoot) {
      return gitRoot;
    }
  }

  throw new ProdifyError('Could not resolve repository root from the current working directory.', {
    code: 'REPO_ROOT_NOT_FOUND'
  });
}
