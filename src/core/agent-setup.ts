import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { getRuntimeProfile } from './targets.js';
import type { GlobalAgentSetupState, RuntimeProfileName } from '../types.js';

export const GLOBAL_AGENT_SETUP_SCHEMA_VERSION = '1';
export const PRODIFY_RUNTIME_COMMANDS = ['$prodify-init', '$prodify-execute', '$prodify-resume'] as const;

function resolveCodexHome(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.CODEX_HOME?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  return path.join(os.homedir(), '.codex');
}

function resolveCodexSkillsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveCodexHome(env), 'skills');
}

function renderCodexSkill(name: 'prodify-init' | 'prodify-execute' | 'prodify-resume'): string {
  if (name === 'prodify-init') {
    return `---
name: "prodify-init"
description: "Bootstrap Prodify inside the current repository."
metadata:
  short-description: "Bootstrap Prodify inside the current repository."
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning \`$prodify-init\`.
- Ignore trailing arguments unless the repository-specific runtime instructions require them.
</codex_skill_adapter>

# prodify-init

Use this runtime bridge to bootstrap Prodify inside the current repository.

Bootstrap checklist:
- locate the current repo root
- verify \`.prodify/\` exists
- read \`.prodify/runtime/bootstrap.json\` first
- read \`.prodify/runtime/current-stage.json\` when present
- detect or resolve the active agent runtime
- read \`.prodify/state.json\`

If \`.prodify/\` is missing, stop and tell the user to run \`prodify init\`.
If \`.prodify/runtime/bootstrap.json\` is missing, malformed, or stale, stop and tell the user to run \`prodify update\`.
Keep the runtime anchored to \`.prodify/\`.
Treat \`.prodify/AGENTS.md\` as a compact human pointer only, not the canonical machine bootstrap source.

Available runtime commands:
- \`$prodify-init\`
- \`$prodify-execute\`
- \`$prodify-execute --auto\`
- \`$prodify-resume\`
`;
  }

  if (name === 'prodify-execute') {
    return `---
name: "prodify-execute"
description: "Execute the next Prodify workflow stage inside the current repository."
metadata:
  short-description: "Execute the next Prodify workflow stage."
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning \`$prodify-execute\`.
- Treat all user text after \`$prodify-execute\` as \`{{PRODIFY_EXECUTE_ARGS}}\`.
- If no arguments are present, treat \`{{PRODIFY_EXECUTE_ARGS}}\` as empty.
</codex_skill_adapter>

# prodify-execute

Use this runtime bridge to execute the next Prodify workflow stage.

Load and follow, in this order:
- \`.prodify/runtime/bootstrap.json\`
- \`.prodify/runtime/current-stage.json\`
- \`.prodify/state.json\`

Interpret \`{{PRODIFY_EXECUTE_ARGS}}\` as the runtime command arguments.
- empty: run \`$prodify-execute\`
- \`--auto\`: run \`$prodify-execute --auto\`

Keep all execution state, artifacts, contracts, and validation anchored to \`.prodify/\`.
`;
  }

  return `---
name: "prodify-resume"
description: "Resume a paused Prodify run from saved runtime state."
metadata:
  short-description: "Resume a paused Prodify run."
---

<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning \`$prodify-resume\`.
- Treat trailing arguments as optional runtime-specific hints only when the repository guidance explicitly supports them.
</codex_skill_adapter>

# prodify-resume

Use this runtime bridge to resume Prodify from saved runtime state.

Load and follow, in this order:
- \`.prodify/runtime/bootstrap.json\`
- \`.prodify/runtime/current-stage.json\`
- \`.prodify/state.json\`

Resume from the current state recorded under \`.prodify/state.json\`.
Preserve validation checkpoints and stop clearly if the state is corrupt or non-resumable.
`;
}

async function installCodexRuntimeCommands(env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
  const skillsRoot = resolveCodexSkillsRoot(env);
  const installedFiles: string[] = [];

  for (const command of ['prodify-init', 'prodify-execute', 'prodify-resume'] as const) {
    const skillPath = path.join(skillsRoot, command, 'SKILL.md');
    await writeFileEnsuringDir(skillPath, renderCodexSkill(command));
    installedFiles.push(skillPath);
  }

  return installedFiles;
}

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
): Promise<{ statePath: string; configuredAgents: RuntimeProfileName[]; alreadyConfigured: boolean; installedPaths: string[] }> {
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

  const installedPaths = profile.name === 'codex'
    ? await installCodexRuntimeCommands(env)
    : [];
  const statePath = await writeGlobalAgentSetupState(nextState, { env });
  return {
    statePath,
    configuredAgents: listConfiguredAgents(nextState),
    alreadyConfigured,
    installedPaths
  };
}
