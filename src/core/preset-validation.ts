import { ProdifyError } from './errors.js';
import type { PresetEntry } from '../types.js';

const REQUIRED_PRESET_ENTRIES = [
  '.prodify/AGENTS.md',
  '.prodify/project.md',
  '.prodify/planning.md',
  '.prodify/runtime-commands.md',
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
