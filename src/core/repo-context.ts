import fs from 'node:fs/promises';

import { listFilesRecursive, pathExists } from './fs.js';
import { resolveRepoPath } from './paths.js';
import type { RepoContextSnapshot } from '../types.js';

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

async function readPackageJson(repoRoot: string): Promise<Record<string, unknown> | null> {
  const packageJsonPath = resolveRepoPath(repoRoot, 'package.json');
  if (!(await pathExists(packageJsonPath))) {
    return null;
  }

  try {
    return JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function dependencyEntries(packageJson: Record<string, unknown> | null): string[] {
  if (!packageJson) {
    return [];
  }

  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const names = [];
  for (const section of sections) {
    const record = packageJson[section];
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      continue;
    }

    names.push(...Object.keys(record as Record<string, unknown>));
  }

  return sortedUnique(names);
}

export async function detectRepoContext(repoRoot: string): Promise<RepoContextSnapshot> {
  const packageJson = await readPackageJson(repoRoot);
  const dependencies = dependencyEntries(packageJson);
  const files = await listFilesRecursive(repoRoot);
  const relativePaths = files.map((entry) => entry.relativePath.replaceAll('\\', '/'));

  const hasTsConfig = relativePaths.includes('tsconfig.json');
  const hasTypeScriptSources = relativePaths.some((relativePath) => relativePath.endsWith('.ts') || relativePath.endsWith('.tsx'));
  const hasJavaScriptSources = relativePaths.some((relativePath) => relativePath.endsWith('.js') || relativePath.endsWith('.jsx'));
  const hasTests = relativePaths.some((relativePath) => relativePath.startsWith('tests/') || relativePath.includes('.test.'));
  const hasCliEntrypoint = relativePaths.includes('src/cli.ts')
    || relativePaths.includes('src/cli.js')
    || relativePaths.includes('bin/prodify');
  const hasCoreDir = relativePaths.some((relativePath) => relativePath.startsWith('src/core/'));
  const hasCommandsDir = relativePaths.some((relativePath) => relativePath.startsWith('src/commands/'));

  const languages = sortedUnique([
    ...(hasTypeScriptSources || hasTsConfig ? ['typescript'] : []),
    ...(hasJavaScriptSources || packageJson ? ['javascript'] : [])
  ]);

  const frameworks = sortedUnique([
    ...(dependencies.includes('react') || dependencies.includes('react-dom') ? ['react'] : [])
  ]);

  const projectTypes = sortedUnique([
    ...(packageJson ? ['node-package'] : []),
    ...(hasCliEntrypoint ? ['cli'] : []),
    ...(frameworks.includes('react') ? ['frontend-app'] : []),
    ...(!frameworks.includes('react') && hasCoreDir ? ['backend-service'] : [])
  ]);

  const architecturePatterns = sortedUnique([
    ...(hasCoreDir && hasCommandsDir ? ['layered-cli'] : []),
    ...(relativePaths.some((relativePath) => relativePath.startsWith('src/contracts/')) ? ['contract-driven-runtime'] : [])
  ]);

  const riskSignals = sortedUnique([
    ...(dependencies.length > 0 ? ['external-dependencies'] : []),
    ...(hasCliEntrypoint ? ['cli-surface'] : []),
    ...(!hasTests ? ['missing-tests'] : [])
  ]);

  return {
    languages,
    frameworks,
    project_types: projectTypes,
    architecture_patterns: architecturePatterns,
    risk_signals: riskSignals
  };
}
