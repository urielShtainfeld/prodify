import type { RuntimeProfile, RuntimeProfileName } from '../types.js';
import { isRuntimeProfileName } from './paths.js';

export const RUNTIME_PROFILES: Record<RuntimeProfileName, RuntimeProfile> = {
  codex: {
    name: 'codex',
    displayName: 'Codex',
    bootstrapPrompt: 'Read .prodify/AGENTS.md and bootstrap Prodify for this repository.',
    bootstrapSummary: 'Manual bootstrap through .prodify/AGENTS.md.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['Prefer the explicit instruction to read .prodify/AGENTS.md before any repo scan.']
  },
  claude: {
    name: 'claude',
    displayName: 'Claude',
    bootstrapPrompt: 'Read .prodify/AGENTS.md and bootstrap Prodify for this repository. Then use the runtime commands from that file.',
    bootstrapSummary: 'Manual bootstrap from canonical guidance inside .prodify/.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['Keep the flow anchored to .prodify/AGENTS.md instead of relying on root discovery.']
  },
  copilot: {
    name: 'copilot',
    displayName: 'Copilot',
    bootstrapPrompt: 'Read .prodify/AGENTS.md, bootstrap Prodify for this repository, and keep the workflow state under .prodify/.',
    bootstrapSummary: 'Manual bootstrap with explicit .prodify-only state.',
    executeCommand: '$prodify-execute',
    resumeCommand: '$prodify-resume',
    nuances: ['The main flow does not require .github/copilot-instructions.md.']
  },
  opencode: {
    name: 'opencode',
    displayName: 'OpenCode',
    bootstrapPrompt: 'Read .prodify/AGENTS.md and bootstrap Prodify for this repository using the .prodify runtime state.',
    bootstrapSummary: 'Manual bootstrap with runtime state anchored in .prodify/state.json.',
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
