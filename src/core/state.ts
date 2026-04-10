import fs from 'node:fs/promises';

import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { isRuntimeProfileName, resolveCanonicalPath } from './paths.js';
import { writeRefactorBaselineSnapshot } from './diff-validator.js';
import { syncRuntimeMetadata } from './runtime-metadata.js';
import { syncScoreArtifactsForRuntimeState } from '../scoring/model.js';
import type {
  ExecutionMode,
  FlowStage,
  ProdifyState,
  RuntimeBootstrapMetadata,
  RuntimeFailureMetadata,
  RuntimeStateBlock,
  RuntimeStatus,
  StageValidationResult,
  ValidationResult,
  VersionMetadata
} from '../types.js';

export const RUNTIME_STATE_SCHEMA_VERSION = '2';

export const RUNTIME_STATUS: Record<string, RuntimeStatus> = {
  NOT_BOOTSTRAPPED: 'not_bootstrapped',
  READY: 'ready',
  RUNNING: 'running',
  AWAITING_VALIDATION: 'awaiting_validation',
  BLOCKED: 'blocked',
  FAILED: 'failed',
  COMPLETE: 'complete'
};

function isExecutionMode(value: unknown): value is ExecutionMode {
  return value === 'interactive' || value === 'auto';
}

function isFlowStage(value: unknown): value is FlowStage {
  return value === 'understand'
    || value === 'diagnose'
    || value === 'architecture'
    || value === 'plan'
    || value === 'refactor'
    || value === 'validate';
}

function isRuntimeStatus(value: unknown): value is RuntimeStatus {
  return value === 'not_bootstrapped'
    || value === 'ready'
    || value === 'running'
    || value === 'awaiting_validation'
    || value === 'blocked'
    || value === 'failed'
    || value === 'complete';
}

function isValidationResult(value: unknown): value is ValidationResult {
  return value === 'unknown' || value === 'pass' || value === 'fail' || value === 'inconclusive';
}

function isRuntimeContractState(value: unknown): value is RuntimeStateBlock['current_state'] {
  return typeof value === 'string' && [
    'not_bootstrapped',
    'bootstrapped',
    'understand_pending',
    'understand_complete',
    'diagnose_pending',
    'diagnose_complete',
    'architecture_pending',
    'architecture_complete',
    'plan_pending',
    'plan_complete',
    'refactor_pending',
    'refactor_complete',
    'validate_pending',
    'validate_complete',
    'blocked',
    'failed',
    'completed'
  ].includes(value);
}

function normalizeStageList(value: unknown): FlowStage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isFlowStage);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function normalizeBootstrapMetadata(value: unknown): RuntimeBootstrapMetadata {
  const record = asRecord(value);
  return {
    bootstrapped: Boolean(record.bootstrapped)
  };
}

function normalizeFailureMetadata(value: unknown): RuntimeFailureMetadata | null {
  if (!value) {
    return null;
  }

  const record = asRecord(value);
  return {
    stage: isFlowStage(record.stage) ? record.stage : null,
    contract_version: typeof record.contract_version === 'string' ? record.contract_version : null,
    reason: typeof record.reason === 'string' ? record.reason : 'unknown failure'
  };
}

function normalizeValidation(value: unknown): StageValidationResult | null {
  if (!value) {
    return null;
  }

  const record = asRecord(value);
  return {
    stage: isFlowStage(record.stage) ? record.stage : 'understand',
    contract_version: typeof record.contract_version === 'string' ? record.contract_version : 'unknown',
    passed: Boolean(record.passed),
    violated_rules: Array.isArray(record.violated_rules)
      ? record.violated_rules
        .map((entry) => asRecord(entry))
        .map((entry) => ({
          rule: typeof entry.rule === 'string' ? entry.rule : 'unknown',
          message: typeof entry.message === 'string' ? entry.message : 'validation issue',
          path: typeof entry.path === 'string' ? entry.path : undefined
        }))
      : [],
    missing_artifacts: Array.isArray(record.missing_artifacts)
      ? record.missing_artifacts.filter((entry): entry is string => typeof entry === 'string')
      : [],
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((entry): entry is string => typeof entry === 'string')
      : [],
    diagnostics: Array.isArray(record.diagnostics)
      ? record.diagnostics.filter((entry): entry is string => typeof entry === 'string')
      : []
  };
}

function normalizeValidatedContractVersions(value: unknown): Partial<Record<FlowStage, string>> {
  const record = asRecord(value);
  const normalized: Partial<Record<FlowStage, string>> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    if (isFlowStage(key) && typeof rawValue === 'string') {
      normalized[key] = rawValue;
    }
  }

  return normalized;
}

export function createInitialRuntimeState({ presetMetadata }: { presetMetadata: VersionMetadata }): ProdifyState {
  return {
    schema_version: RUNTIME_STATE_SCHEMA_VERSION,
    preset_name: presetMetadata.name,
    preset_version: presetMetadata.version,
    runtime: {
      status: RUNTIME_STATUS.NOT_BOOTSTRAPPED,
      current_state: 'not_bootstrapped',
      mode: null,
      current_stage: null,
      current_task_id: null,
      pending_stage: null,
      completed_stages: [],
      awaiting_user_validation: false,
      last_validation_result: 'unknown',
      last_validation: null,
      last_validated_contract_versions: {},
      resumable: false,
      blocked_reason: null,
      failure_metadata: null,
      bootstrap: {
        bootstrapped: false
      },
      next_action: '$prodify-init',
      timestamps: {
        bootstrapped_at: null,
        last_transition_at: null,
        completed_at: null
      }
    }
  };
}

function normalizeRuntimeBlock(runtime: unknown): RuntimeStateBlock {
  const record = asRecord(runtime);
  const timestamps = asRecord(record.timestamps);

  return {
    status: isRuntimeStatus(record.status) ? record.status : RUNTIME_STATUS.NOT_BOOTSTRAPPED,
    current_state: isRuntimeContractState(record.current_state) ? record.current_state : 'not_bootstrapped',
    mode: isExecutionMode(record.mode) ? record.mode : null,
    current_stage: isFlowStage(record.current_stage) ? record.current_stage : null,
    current_task_id: typeof record.current_task_id === 'string' ? record.current_task_id : null,
    pending_stage: isFlowStage(record.pending_stage) ? record.pending_stage : null,
    completed_stages: normalizeStageList(record.completed_stages),
    awaiting_user_validation: Boolean(record.awaiting_user_validation),
    last_validation_result: isValidationResult(record.last_validation_result) ? record.last_validation_result : 'unknown',
    last_validation: normalizeValidation(record.last_validation),
    last_validated_contract_versions: normalizeValidatedContractVersions(record.last_validated_contract_versions),
    resumable: Boolean(record.resumable),
    blocked_reason: typeof record.blocked_reason === 'string' ? record.blocked_reason : null,
    failure_metadata: normalizeFailureMetadata(record.failure_metadata),
    bootstrap: normalizeBootstrapMetadata(record.bootstrap),
    next_action: typeof record.next_action === 'string' ? record.next_action : '$prodify-init',
    timestamps: {
      bootstrapped_at: typeof timestamps.bootstrapped_at === 'string' ? timestamps.bootstrapped_at : null,
      last_transition_at: typeof timestamps.last_transition_at === 'string' ? timestamps.last_transition_at : null,
      completed_at: typeof timestamps.completed_at === 'string' ? timestamps.completed_at : null
    }
  };
}

export function normalizeRuntimeState(raw: unknown, { presetMetadata }: { presetMetadata: VersionMetadata }): ProdifyState {
  const record = asRecord(raw);
  const base = createInitialRuntimeState({ presetMetadata });

  return {
    ...base,
    schema_version: base.schema_version,
    preset_name: presetMetadata.name,
    preset_version: presetMetadata.version,
    runtime: normalizeRuntimeBlock(record.runtime)
  };
}

export function serializeRuntimeState(state: ProdifyState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export async function readRuntimeState(
  repoRoot: string,
  { allowMissing = false, presetMetadata }: { allowMissing?: boolean; presetMetadata: VersionMetadata }
): Promise<ProdifyState | null> {
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

export async function writeRuntimeState(repoRoot: string, state: ProdifyState): Promise<void> {
  const statePath = resolveCanonicalPath(repoRoot, '.prodify/state.json');
  await writeFileEnsuringDir(statePath, serializeRuntimeState(state));
  if (state.runtime.current_state === 'refactor_pending') {
    await writeRefactorBaselineSnapshot(repoRoot);
  }
  await syncScoreArtifactsForRuntimeState(repoRoot, state);
  await syncRuntimeMetadata(repoRoot, state);
}
