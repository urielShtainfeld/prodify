import type { LegacyTargetDefinition, RuntimeProfileName } from '../types.js';
import { ProdifyError } from '../core/errors.js';
import { LEGACY_TARGET_PATH_DEFINITIONS, isRuntimeProfileName } from '../core/paths.js';
import { generateCodexContent } from '../generators/codex.js';
import { generateClaudeContent } from '../generators/claude.js';
import { generateCopilotContent } from '../generators/copilot.js';
import { generateOpenCodeContent } from '../generators/opencode.js';

export const LEGACY_TARGET_REGISTRY: Record<RuntimeProfileName, LegacyTargetDefinition> = {
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

export function listLegacyTargets(): LegacyTargetDefinition[] {
  return Object.values(LEGACY_TARGET_REGISTRY);
}

export function getLegacyTarget(agent: string | null | undefined): LegacyTargetDefinition | null {
  if (!agent || !isRuntimeProfileName(agent)) {
    return null;
  }

  return LEGACY_TARGET_REGISTRY[agent];
}

export function assertSupportedInstallTarget(agent: string): LegacyTargetDefinition {
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
