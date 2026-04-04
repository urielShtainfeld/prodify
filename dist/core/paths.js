import path from 'node:path';
export const RUNTIME_PROFILE_NAMES = ['codex', 'claude', 'copilot', 'opencode'];
export const USER_OWNED_CANONICAL_PATHS = [
    '.prodify/AGENTS.md',
    '.prodify/project.md',
    '.prodify/planning.md'
];
export const USER_OWNED_CANONICAL_PREFIXES = [
    '.prodify/contracts-src/'
];
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
    '.prodify/skills/README.md',
    '.prodify/skills/registry.json',
    '.prodify/skills/domain/react-frontend.skill.json',
    '.prodify/skills/domain/typescript-backend.skill.json',
    '.prodify/skills/quality-policy/maintainability-review.skill.json',
    '.prodify/skills/quality-policy/security-hardening.skill.json',
    '.prodify/skills/quality-policy/test-hardening.skill.json',
    '.prodify/skills/stage-method/architecture-method.skill.json',
    '.prodify/skills/stage-method/codebase-scanning.skill.json',
    '.prodify/skills/stage-method/diagnosis-method.skill.json',
    '.prodify/skills/stage-method/planning-method.skill.json',
    '.prodify/skills/stage-method/refactoring-method.skill.json',
    '.prodify/skills/stage-method/validation-method.skill.json',
    '.prodify/state.json',
    '.prodify/tasks/README.md',
    '.prodify/rules/README.md',
    '.prodify/templates/README.md',
    '.prodify/version.json'
];
export function isRuntimeProfileName(value) {
    return typeof value === 'string' && RUNTIME_PROFILE_NAMES.includes(value);
}
export function normalizeRepoRelativePath(relativePath) {
    const normalized = relativePath.replaceAll('\\', '/');
    return path.posix.normalize(normalized).replace(/^\/+/, '');
}
export function resolveRepoPath(repoRoot, relativePath) {
    return path.join(repoRoot, ...normalizeRepoRelativePath(relativePath).split('/'));
}
export function resolveCanonicalPath(repoRoot, relativePath) {
    return resolveRepoPath(repoRoot, relativePath);
}
