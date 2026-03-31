import { ProdifyError } from './errors.js';
import { TARGET_DEFINITIONS } from './paths.js';
import { generateCodexContent } from '../generators/codex.js';

export function getKnownTargetMetadata(agent) {
  return TARGET_DEFINITIONS[agent] ?? null;
}

export function getEnabledGenerator(agent) {
  if (agent === 'codex') {
    return generateCodexContent;
  }

  return null;
}

export function assertSupportedInstallTarget(agent) {
  const metadata = getKnownTargetMetadata(agent);

  if (!metadata) {
    throw new ProdifyError(`Unknown target agent: ${agent}`, {
      code: 'UNKNOWN_TARGET'
    });
  }

  const generator = getEnabledGenerator(agent);
  if (generator) {
    return { metadata, generator };
  }

  if (metadata.status === 'planned') {
    throw new ProdifyError(`Target ${agent} is planned but not yet enabled.`, {
      code: 'TARGET_NOT_ENABLED'
    });
  }

  throw new ProdifyError(`Target ${agent} is experimental and not yet enabled.`, {
    code: 'TARGET_NOT_ENABLED'
  });
}
