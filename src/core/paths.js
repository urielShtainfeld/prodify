import path from 'node:path';

export const KNOWN_TARGETS = ['codex', 'claude', 'copilot', 'opencode'];

export const TARGET_DEFINITIONS = {
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
  '.prodify/project.md',
  '.prodify/planning.md',
  '.prodify/version.json'
];

export function normalizeRepoRelativePath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  return path.posix.normalize(normalized).replace(/^\/+/, '');
}

export function resolveRepoPath(repoRoot, relativePath) {
  return path.join(repoRoot, ...normalizeRepoRelativePath(relativePath).split('/'));
}

export function getTargetDefinition(agent) {
  return TARGET_DEFINITIONS[agent] ?? null;
}

export function resolveTargetPath(repoRoot, agent) {
  const target = getTargetDefinition(agent);
  if (!target) {
    return null;
  }

  return resolveRepoPath(repoRoot, target.targetPath);
}

export function resolveCanonicalPath(repoRoot, relativePath) {
  return resolveRepoPath(repoRoot, relativePath);
}
