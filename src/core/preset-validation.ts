import { ProdifyError } from './errors.js';
import type { PresetEntry } from '../types.js';

const REQUIRED_PRESET_ENTRIES = [
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
  '.prodify/version.json',
  '.prodify/tasks/README.md',
  '.prodify/rules/README.md',
  '.prodify/templates/README.md'
];

export function validatePresetEntries(entries: PresetEntry[]): void {
  const entryPaths = new Set(entries.map((entry) => entry.relativePath));
  const missing = REQUIRED_PRESET_ENTRIES.filter((requiredPath) => !entryPaths.has(requiredPath));

  if (missing.length > 0) {
    throw new ProdifyError(`Default preset is missing required canonical files: ${missing.join(', ')}`, {
      code: 'PRESET_INVALID'
    });
  }
}
