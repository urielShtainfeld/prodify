import { ProdifyError } from './errors.js';
import { TARGET_DEFINITIONS } from './paths.js';
import { generateCodexContent } from '../generators/codex.js';
import { generateClaudeContent } from '../generators/claude.js';
import { generateCopilotContent } from '../generators/copilot.js';
import { generateOpenCodeContent } from '../generators/opencode.js';

export const TARGET_REGISTRY = {
  codex: {
    ...TARGET_DEFINITIONS.codex,
    enabled: true,
    doctorEligible: true,
    generator: generateCodexContent
  },
  claude: {
    ...TARGET_DEFINITIONS.claude,
    enabled: true,
    doctorEligible: true,
    generator: generateClaudeContent
  },
  copilot: {
    ...TARGET_DEFINITIONS.copilot,
    enabled: true,
    doctorEligible: true,
    generator: generateCopilotContent
  },
  opencode: {
    ...TARGET_DEFINITIONS.opencode,
    enabled: true,
    doctorEligible: true,
    generator: generateOpenCodeContent
  }
};

export function listRegisteredTargets() {
  return Object.values(TARGET_REGISTRY);
}

export function getKnownTargetMetadata(agent) {
  return TARGET_REGISTRY[agent] ?? null;
}

export function assertSupportedInstallTarget(agent) {
  const metadata = getKnownTargetMetadata(agent);

  if (!metadata) {
    throw new ProdifyError(`Unknown target agent: ${agent}`, {
      code: 'UNKNOWN_TARGET'
    });
  }

  if (!metadata.enabled || !metadata.generator) {
    const message = metadata.status === 'experimental'
      ? `Target ${agent} is experimental and not yet enabled.`
      : `Target ${agent} is planned but not yet enabled.`;

    throw new ProdifyError(message, {
      code: 'TARGET_NOT_ENABLED'
    });
  }

  return metadata;
}
