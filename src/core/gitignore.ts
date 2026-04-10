import fs from 'node:fs/promises';

import { pathExists, writeFileEnsuringDir } from './fs.js';
import { resolveRepoPath } from './paths.js';

const PRODIFY_GITIGNORE_BEGIN = '# BEGIN PRODIFY GENERATED';
const PRODIFY_GITIGNORE_END = '# END PRODIFY GENERATED';

const PRODIFY_IGNORES = [
  '.prodify/contracts/',
  '.prodify/runtime/',
  '.prodify/artifacts/',
  '.prodify/metrics/',
  '.prodify/state.json'
] as const;

const BLANKET_PRODIFY_PATTERNS = new Set(['.prodify', '.prodify/', '/.prodify', '/.prodify/']);

function detectEol(content: string): '\n' | '\r\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function normalizeIgnoreEntry(entry: string): string {
  return entry.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function isManagedEntry(entry: string): boolean {
  return PRODIFY_IGNORES.includes(normalizeIgnoreEntry(entry) as typeof PRODIFY_IGNORES[number]);
}

function isBlanketProdifyRule(entry: string): boolean {
  return BLANKET_PRODIFY_PATTERNS.has(normalizeIgnoreEntry(entry));
}

async function detectTrackedRuntimeFiles(repoRoot: string): Promise<string[]> {
  const gitDir = resolveRepoPath(repoRoot, '.git');
  const gitIndex = resolveRepoPath(repoRoot, '.git/index');
  if (!(await pathExists(gitDir)) || !(await pathExists(gitIndex))) {
    return [];
  }

  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync('git', [
      'ls-files',
      '--',
      '.prodify/contracts',
      '.prodify/runtime',
      '.prodify/artifacts',
      '.prodify/metrics',
      '.prodify/state.json'
    ], {
      cwd: repoRoot
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export interface GitignoreSyncResult {
  path: string;
  created: boolean;
  updated: boolean;
  warnings: string[];
  trackedRuntimeFiles: string[];
}

export async function syncProdifyGitignore(repoRoot: string): Promise<GitignoreSyncResult> {
  const gitignorePath = resolveRepoPath(repoRoot, '.gitignore');
  const exists = await pathExists(gitignorePath);
  const original = exists ? await fs.readFile(gitignorePath, 'utf8') : '';
  const eol = detectEol(original);
  const warnings: string[] = [];
  const lines = original === '' ? [] : original.replace(/\r\n/g, '\n').split('\n');

  const beginIndex = lines.findIndex((line) => line.trim() === PRODIFY_GITIGNORE_BEGIN);
  const endIndex = lines.findIndex((line) => line.trim() === PRODIFY_GITIGNORE_END);
  const malformedManagedBlock = (beginIndex === -1) !== (endIndex === -1) || (beginIndex !== -1 && endIndex < beginIndex);
  if (malformedManagedBlock) {
    warnings.push('Repaired malformed Prodify-managed .gitignore block.');
  }

  const filteredLines: string[] = [];
  let skippedManagedBlock = false;
  let removedBlanketRule = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (trimmed === PRODIFY_GITIGNORE_BEGIN) {
      skippedManagedBlock = true;
      continue;
    }
    if (trimmed === PRODIFY_GITIGNORE_END) {
      skippedManagedBlock = false;
      continue;
    }
    if (skippedManagedBlock) {
      continue;
    }
    if (isBlanketProdifyRule(trimmed)) {
      removedBlanketRule = true;
      continue;
    }

    filteredLines.push(line);
  }

  if (removedBlanketRule) {
    warnings.push('Repaired blanket `.prodify/` ignore to selective generated-runtime ignores.');
  }

  const existingNormalizedEntries = new Set(
    filteredLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => normalizeIgnoreEntry(line))
  );
  const managedEntries = PRODIFY_IGNORES.filter((entry) => !existingNormalizedEntries.has(normalizeIgnoreEntry(entry)));

  const nextLines = [...filteredLines];
  while (nextLines.length > 0 && nextLines[nextLines.length - 1]?.trim() === '') {
    nextLines.pop();
  }
  if (nextLines.length > 0) {
    nextLines.push('');
  }
  nextLines.push(PRODIFY_GITIGNORE_BEGIN);
  for (const entry of managedEntries) {
    nextLines.push(entry);
  }
  nextLines.push(PRODIFY_GITIGNORE_END);
  if (nextLines[nextLines.length - 1] !== '') {
    nextLines.push('');
  }

  const nextContent = nextLines.join(eol);
  if (!exists || nextContent !== original) {
    await writeFileEnsuringDir(gitignorePath, nextContent);
  }

  const trackedRuntimeFiles = await detectTrackedRuntimeFiles(repoRoot);
  if (trackedRuntimeFiles.length > 0) {
    warnings.push(`Generated Prodify runtime files are already tracked: ${trackedRuntimeFiles.join(', ')}`);
  }

  return {
    path: gitignorePath,
    created: !exists,
    updated: !exists || nextContent !== original,
    warnings,
    trackedRuntimeFiles
  };
}
