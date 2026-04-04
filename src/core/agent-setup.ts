import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { getRuntimeProfile } from './targets.js';
import type { GlobalAgentSetupState, RuntimeProfileName } from '../types.js';

export const GLOBAL_AGENT_SETUP_SCHEMA_VERSION = '1';
export const PRODIFY_RUNTIME_COMMANDS = ['$prodify-init', '$prodify-execute', '$prodify-resume'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

export function resolveGlobalProdifyHome(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.PRODIFY_HOME?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const xdgStateHome = env.XDG_STATE_HOME?.trim();
  if (xdgStateHome) {
    return path.resolve(xdgStateHome, 'prodify');
  }

  return path.join(os.homedir(), '.prodify');
}

export function resolveGlobalAgentSetupStatePath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveGlobalProdifyHome(env), 'agent-setup.json');
}

export function createInitialGlobalAgentSetupState(): GlobalAgentSetupState {
  return {
    schema_version: GLOBAL_AGENT_SETUP_SCHEMA_VERSION,
    configured_agents: {}
  };
}

export function listConfiguredAgents(state: GlobalAgentSetupState | null): RuntimeProfileName[] {
  if (!state) {
    return [];
  }

  return Object.entries(state.configured_agents)
    .filter(([, value]) => Boolean(value))
    .map(([agent]) => agent as RuntimeProfileName)
    .sort((left, right) => left.localeCompare(right));
}

function normalizeGlobalAgentSetupState(raw: unknown): GlobalAgentSetupState {
  const record = asRecord(raw);
  const configuredAgents = asRecord(record.configured_agents);
  const normalized = createInitialGlobalAgentSetupState();

  for (const [agent, value] of Object.entries(configuredAgents)) {
    const profile = getRuntimeProfile(agent);
    const entry = asRecord(value);
    if (!profile) {
      continue;
    }

    normalized.configured_agents[profile.name] = {
      agent: profile.name,
      display_name: typeof entry.display_name === 'string' ? entry.display_name : profile.displayName,
      configured_at: typeof entry.configured_at === 'string' ? entry.configured_at : 'unknown',
      commands: Array.isArray(entry.commands)
        ? entry.commands.filter((command): command is string => typeof command === 'string')
        : [...PRODIFY_RUNTIME_COMMANDS]
    };
  }

  return normalized;
}

export async function readGlobalAgentSetupState(
  { allowMissing = false, env = process.env }: { allowMissing?: boolean; env?: NodeJS.ProcessEnv } = {}
): Promise<GlobalAgentSetupState | null> {
  const statePath = resolveGlobalAgentSetupStatePath(env);
  if (!(await pathExists(statePath))) {
    if (allowMissing) {
      return null;
    }

    throw new ProdifyError(`Global agent setup state is missing: ${statePath}`, {
      code: 'GLOBAL_AGENT_SETUP_MISSING'
    });
  }

  try {
    return normalizeGlobalAgentSetupState(JSON.parse(await fs.readFile(statePath, 'utf8')));
  } catch {
    throw new ProdifyError(`Global agent setup state is malformed: ${statePath}`, {
      code: 'GLOBAL_AGENT_SETUP_MALFORMED'
    });
  }
}

export async function writeGlobalAgentSetupState(
  state: GlobalAgentSetupState,
  { env = process.env }: { env?: NodeJS.ProcessEnv } = {}
): Promise<string> {
  const statePath = resolveGlobalAgentSetupStatePath(env);
  await writeFileEnsuringDir(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return statePath;
}

export async function setupAgentIntegration(
  agent: string,
  {
    now = new Date().toISOString(),
    env = process.env
  }: {
    now?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<{ statePath: string; configuredAgents: RuntimeProfileName[]; alreadyConfigured: boolean }> {
  const profile = getRuntimeProfile(agent);
  if (!profile) {
    throw new ProdifyError('setup-agent requires <codex|claude|copilot|opencode>.', {
      code: 'INVALID_AGENT'
    });
  }

  const existingState = await readGlobalAgentSetupState({
    allowMissing: true,
    env
  });
  const nextState = existingState ?? createInitialGlobalAgentSetupState();
  const alreadyConfigured = Boolean(nextState.configured_agents[profile.name]);

  nextState.configured_agents[profile.name] = {
    agent: profile.name,
    display_name: profile.displayName,
    configured_at: now,
    commands: [...PRODIFY_RUNTIME_COMMANDS]
  };

  const statePath = await writeGlobalAgentSetupState(nextState, { env });
  return {
    statePath,
    configuredAgents: listConfiguredAgents(nextState),
    alreadyConfigured
  };
}
