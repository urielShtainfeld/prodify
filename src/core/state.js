import fs from 'node:fs/promises';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { KNOWN_TARGETS, resolveCanonicalPath } from './paths.js';

export const RUNTIME_STATE_SCHEMA_VERSION = '1';

export const RUNTIME_STATUS = {
  NOT_BOOTSTRAPPED: 'not_bootstrapped',
  READY: 'ready',
  RUNNING: 'running',
  AWAITING_VALIDATION: 'awaiting_validation',
  BLOCKED: 'blocked',
  FAILED: 'failed',
  COMPLETE: 'complete'
};

export function createInitialRuntimeState({ presetMetadata }) {
  return {
    schema_version: RUNTIME_STATE_SCHEMA_VERSION,
    preset_name: presetMetadata.name,
    preset_version: presetMetadata.version,
    primary_agent: null,
    runtime: {
      status: RUNTIME_STATUS.NOT_BOOTSTRAPPED,
      mode: null,
      selected_agent: null,
      current_stage: null,
      current_task_id: null,
      completed_stages: [],
      awaiting_user_validation: false,
      last_validation_result: 'unknown',
      resumable: false,
      blocked_reason: null,
      next_action: '$prodify-init',
      timestamps: {
        bootstrapped_at: null,
        last_transition_at: null,
        completed_at: null
      }
    }
  };
}

function normalizeRuntimeBlock(runtime) {
  const timestamps = runtime?.timestamps ?? {};

  return {
    status: runtime?.status ?? RUNTIME_STATUS.NOT_BOOTSTRAPPED,
    mode: runtime?.mode ?? null,
    selected_agent: KNOWN_TARGETS.includes(runtime?.selected_agent) ? runtime.selected_agent : null,
    current_stage: runtime?.current_stage ?? null,
    current_task_id: runtime?.current_task_id ?? null,
    completed_stages: Array.isArray(runtime?.completed_stages) ? [...runtime.completed_stages] : [],
    awaiting_user_validation: Boolean(runtime?.awaiting_user_validation),
    last_validation_result: runtime?.last_validation_result ?? 'unknown',
    resumable: Boolean(runtime?.resumable),
    blocked_reason: runtime?.blocked_reason ?? null,
    next_action: runtime?.next_action ?? '$prodify-init',
    timestamps: {
      bootstrapped_at: timestamps.bootstrapped_at ?? null,
      last_transition_at: timestamps.last_transition_at ?? null,
      completed_at: timestamps.completed_at ?? null
    }
  };
}

export function normalizeRuntimeState(raw, { presetMetadata }) {
  const base = createInitialRuntimeState({ presetMetadata });

  return {
    ...base,
    schema_version: raw?.schema_version ?? base.schema_version,
    preset_name: raw?.preset_name ?? presetMetadata.name,
    preset_version: raw?.preset_version ?? presetMetadata.version,
    primary_agent: KNOWN_TARGETS.includes(raw?.primary_agent) ? raw.primary_agent : null,
    runtime: normalizeRuntimeBlock(raw?.runtime)
  };
}

export function serializeRuntimeState(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export async function readRuntimeState(repoRoot, { allowMissing = false, presetMetadata } = {}) {
  const statePath = resolveCanonicalPath(repoRoot, '.prodify/state.json');

  if (!(await pathExists(statePath))) {
    if (allowMissing) {
      return null;
    }

    throw new ProdifyError('Runtime state is missing: .prodify/state.json', {
      code: 'RUNTIME_STATE_MISSING'
    });
  }

  try {
    const raw = JSON.parse(await fs.readFile(statePath, 'utf8'));
    return normalizeRuntimeState(raw, { presetMetadata });
  } catch {
    throw new ProdifyError('Runtime state is malformed: .prodify/state.json', {
      code: 'RUNTIME_STATE_MALFORMED'
    });
  }
}

export async function writeRuntimeState(repoRoot, state) {
  const statePath = resolveCanonicalPath(repoRoot, '.prodify/state.json');
  await writeFileEnsuringDir(statePath, serializeRuntimeState(state));
}
