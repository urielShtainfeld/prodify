import { ProdifyError } from './errors.js';
import { LEGACY_TARGET_PATH_DEFINITIONS, isRuntimeProfileName } from './paths.js';
import { generateCodexContent } from '../generators/codex.js';
import { generateClaudeContent } from '../generators/claude.js';
import { generateCopilotContent } from '../generators/copilot.js';
import { generateOpenCodeContent } from '../generators/opencode.js';
export const RUNTIME_PROFILES = {
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
export const LEGACY_TARGET_REGISTRY = {
    codex: {
        ...LEGACY_TARGET_PATH_DEFINITIONS.codex,
        enabled: true,
        doctorEligible: false,
        generator: generateCodexContent
    },
    claude: {
        ...LEGACY_TARGET_PATH_DEFINITIONS.claude,
        enabled: true,
        doctorEligible: false,
        generator: generateClaudeContent
    },
    copilot: {
        ...LEGACY_TARGET_PATH_DEFINITIONS.copilot,
        enabled: true,
        doctorEligible: false,
        generator: generateCopilotContent
    },
    opencode: {
        ...LEGACY_TARGET_PATH_DEFINITIONS.opencode,
        enabled: true,
        doctorEligible: false,
        generator: generateOpenCodeContent
    }
};
export function listRuntimeProfiles() {
    return Object.values(RUNTIME_PROFILES);
}
export function getRuntimeProfile(agent) {
    if (!agent || !isRuntimeProfileName(agent)) {
        return null;
    }
    return RUNTIME_PROFILES[agent];
}
export function listLegacyTargets() {
    return Object.values(LEGACY_TARGET_REGISTRY);
}
export function getLegacyTarget(agent) {
    if (!agent || !isRuntimeProfileName(agent)) {
        return null;
    }
    return LEGACY_TARGET_REGISTRY[agent];
}
export function assertSupportedInstallTarget(agent) {
    const metadata = getLegacyTarget(agent);
    if (!metadata) {
        throw new ProdifyError(`Unknown target agent: ${agent}`, {
            code: 'UNKNOWN_TARGET'
        });
    }
    if (!metadata.enabled || !metadata.generator) {
        throw new ProdifyError(`Legacy compatibility target ${agent} is not enabled.`, {
            code: 'TARGET_NOT_ENABLED'
        });
    }
    return metadata;
}
