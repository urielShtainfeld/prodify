import path from 'node:path';
import type { LegacyTargetStatus, RuntimeProfileName } from '../types.js';

export const RUNTIME_PROFILE_NAMES = ['codex', 'claude', 'copilot', 'opencode'] as const satisfies readonly RuntimeProfileName[];
export const KNOWN_TARGETS = [...RUNTIME_PROFILE_NAMES];
export const USER_OWNED_CANONICAL_PATHS = [
  '.prodify/AGENTS.md',
  '.prodify/project.md',
  '.prodify/planning.md'
 ] as const;
export const USER_OWNED_CANONICAL_PREFIXES = [
  '.prodify/contracts-src/'
] as const;

export const LEGACY_TARGET_PATH_DEFINITIONS: Record<RuntimeProfileName, {
  agent: RuntimeProfileName;
  status: LegacyTargetStatus;
  canonicalSources: readonly string[];
  targetPath: string;
}> = {
  codex: {
    agent: 'codex',
    status: 'supported',
    canonicalSources: ['.prodify/AGENTS.md'],
    targetPath: 'AGENTS.md'
  },
  claude: {
    agent: 'claude',
    status: 'planned',
    canonicalSources: ['.prodify/AGENTS.md'],
    targetPath: 'CLAUDE.md'
  },
  copilot: {
    agent: 'copilot',
    status: 'planned',
    canonicalSources: ['.prodify/AGENTS.md', '.prodify/project.md'],
    targetPath: '.github/copilot-instructions.md'
  },
  opencode: {
    agent: 'opencode',
    status: 'experimental',
    canonicalSources: ['.prodify/AGENTS.md'],
    targetPath: '.opencode/AGENTS.md'
  }
};

export const REQUIRED_CANONICAL_PATHS = [
  '.prodify/AGENTS.md',
  '.prodify/artifacts/README.md',
  '.prodify/contracts-src/README.md',
  '.prodify/contracts-src/architecture.contract.md',
  '.prodify/contracts-src/diagnose.contract.md',
  '.prodify/contracts-src/plan.contract.md',
  '.prodify/contracts-src/refactor.contract.md',
  '.prodify/contracts-src/understand.contract.md',
  '.prodify/contracts-src/validate.contract.md',
  '.prodify/metrics/README.md',
  '.prodify/project.md',
  '.prodify/planning.md',
  '.prodify/runtime-commands.md',
  '.prodify/state.json',
  '.prodify/tasks/README.md',
  '.prodify/rules/README.md',
  '.prodify/templates/README.md',
  '.prodify/version.json'
 ] as const;

export function isRuntimeProfileName(value: unknown): value is RuntimeProfileName {
  return typeof value === 'string' && (RUNTIME_PROFILE_NAMES as readonly string[]).includes(value);
}

export function normalizeRepoRelativePath(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/');
  return path.posix.normalize(normalized).replace(/^\/+/, '');
}

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.join(repoRoot, ...normalizeRepoRelativePath(relativePath).split('/'));
}

export function getTargetDefinition(agent: string): (typeof LEGACY_TARGET_PATH_DEFINITIONS)[RuntimeProfileName] | null {
  if (!isRuntimeProfileName(agent)) {
    return null;
  }

  return LEGACY_TARGET_PATH_DEFINITIONS[agent] ?? null;
}

export function resolveTargetPath(repoRoot: string, agent: string): string | null {
  const target = getTargetDefinition(agent);
  if (!target) {
    return null;
  }

  return resolveRepoPath(repoRoot, target.targetPath);
}

export function resolveCanonicalPath(repoRoot: string, relativePath: string): string {
  return resolveRepoPath(repoRoot, relativePath);
}
