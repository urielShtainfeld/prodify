import type { RuntimeProfile, RuntimeProfileName } from '../types.js';
import { isRuntimeProfileName } from './paths.js';

export const RUNTIME_PROFILES: Record<RuntimeProfileName, RuntimeProfile> = {
  codex: {
    name: 'codex',
    displayName: 'Codex',
    bootstrapPrompt: 'Open this repository in Codex and run `$prodify-init`.',
    bootstrapSummary: 'Run `$prodify-init` inside Codex.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['`$prodify-init` should load `.prodify/runtime/bootstrap.json` before broader repo context.']
  },
  claude: {
    name: 'claude',
    displayName: 'Claude',
    bootstrapPrompt: 'Open this repository in Claude and run `$prodify-init`.',
    bootstrapSummary: 'Run `$prodify-init` inside Claude.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['Use `.prodify/runtime/bootstrap.json` as the canonical bootstrap source.']
  },
  copilot: {
    name: 'copilot',
    displayName: 'Copilot',
    bootstrapPrompt: 'Open this repository in Copilot and run `$prodify-init`.',
    bootstrapSummary: 'Run `$prodify-init` inside Copilot.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['The main flow does not require .github/copilot-instructions.md.']
  },
  opencode: {
    name: 'opencode',
    displayName: 'OpenCode',
    bootstrapPrompt: 'Open this repository in OpenCode and run `$prodify-init`.',
    bootstrapSummary: 'Run `$prodify-init` inside OpenCode.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['No root-level OpenCode adapter is required for the default flow.']
  }
};

export function listRuntimeProfiles(): RuntimeProfile[] {
  return Object.values(RUNTIME_PROFILES);
}

export function getRuntimeProfile(agent: string | null | undefined): RuntimeProfile | null {
  if (!agent || !isRuntimeProfileName(agent)) {
    return null;
  }

  return RUNTIME_PROFILES[agent];
}
