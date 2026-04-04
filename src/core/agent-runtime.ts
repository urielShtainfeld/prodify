import { ProdifyError } from './errors.js';
import { readGlobalAgentSetupState, listConfiguredAgents } from './agent-setup.js';
import { getRuntimeProfile } from './targets.js';
import type { RuntimeProfileName } from '../types.js';

export function detectRuntimeAgentFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeProfileName | null {
  const candidate = env.PRODIFY_ACTIVE_AGENT?.trim();
  if (!candidate) {
    return null;
  }

  return getRuntimeProfile(candidate)?.name ?? null;
}

export async function resolveRuntimeAgentBinding(
  {
    requestedAgent = null,
    env = process.env
  }: {
    requestedAgent?: string | null;
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<RuntimeProfileName> {
  const explicit = requestedAgent ? getRuntimeProfile(requestedAgent)?.name ?? null : null;
  if (explicit) {
    return explicit;
  }

  const envAgent = detectRuntimeAgentFromEnv(env);
  if (envAgent) {
    return envAgent;
  }

  const setupState = await readGlobalAgentSetupState({
    allowMissing: true,
    env
  });
  const configuredAgents = listConfiguredAgents(setupState);

  if (configuredAgents.length === 1) {
    return configuredAgents[0]!;
  }

  if (configuredAgents.length === 0) {
    throw new ProdifyError('Could not resolve the active agent runtime. Run `prodify setup-agent <agent>` or set PRODIFY_ACTIVE_AGENT.', {
      code: 'AGENT_RUNTIME_UNRESOLVED'
    });
  }

  throw new ProdifyError('Multiple agents are configured globally. Set PRODIFY_ACTIVE_AGENT or pass an explicit agent for runtime binding.', {
    code: 'AGENT_RUNTIME_AMBIGUOUS'
  });
}
