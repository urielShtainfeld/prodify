import { ProdifyError } from './errors.js';
import { isRuntimeProfileName } from './paths.js';
import { RUNTIME_STATUS } from './state.js';
import type {
  ExecutionMode,
  FlowStage,
  ProdifyState,
  ResumeDecision,
  RuntimeProfileName,
  StageValidationResult
} from '../types.js';

export const STAGE_ORDER: FlowStage[] = ['understand', 'diagnose', 'architecture', 'plan', 'refactor', 'validate'];

const STAGE_TASK_IDS: Record<FlowStage, string> = {
  understand: '01-understand',
  diagnose: '02-diagnose',
  architecture: '03-architecture',
  plan: '04-plan',
  refactor: '05-refactor',
  validate: '06-validate'
};

function cloneState(state: ProdifyState): ProdifyState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      completed_stages: [...state.runtime.completed_stages],
      last_validated_contract_versions: {
        ...state.runtime.last_validated_contract_versions
      },
      last_validation: state.runtime.last_validation
        ? {
          ...state.runtime.last_validation,
          violated_rules: [...state.runtime.last_validation.violated_rules],
          missing_artifacts: [...state.runtime.last_validation.missing_artifacts],
          warnings: [...state.runtime.last_validation.warnings],
          diagnostics: [...state.runtime.last_validation.diagnostics],
          ...(state.runtime.last_validation.diff_result ? {
            diff_result: {
              ...state.runtime.last_validation.diff_result,
              modifiedPaths: [...state.runtime.last_validation.diff_result.modifiedPaths],
              addedPaths: [...state.runtime.last_validation.diff_result.addedPaths],
              deletedPaths: [...state.runtime.last_validation.diff_result.deletedPaths],
              formattingOnlyPaths: [...state.runtime.last_validation.diff_result.formattingOnlyPaths],
              commentOnlyPaths: [...state.runtime.last_validation.diff_result.commentOnlyPaths],
              structuralChanges: {
                ...state.runtime.last_validation.diff_result.structuralChanges,
                new_directories: [...state.runtime.last_validation.diff_result.structuralChanges.new_directories],
                new_layer_directories: [...state.runtime.last_validation.diff_result.structuralChanges.new_layer_directories],
                files_with_reduced_responsibility: [...state.runtime.last_validation.diff_result.structuralChanges.files_with_reduced_responsibility],
                new_modules: [...state.runtime.last_validation.diff_result.structuralChanges.new_modules],
                structural_change_flags: [...state.runtime.last_validation.diff_result.structuralChanges.structural_change_flags]
              }
            }
          } : {}),
          ...(state.runtime.last_validation.refactor_impact_report ? {
            refactor_impact_report: {
              ...state.runtime.last_validation.refactor_impact_report,
              cosmetic_only_paths: [...state.runtime.last_validation.refactor_impact_report.cosmetic_only_paths],
              hotspots_touched: [...state.runtime.last_validation.refactor_impact_report.hotspots_touched],
              hotspot_improvements: state.runtime.last_validation.refactor_impact_report.hotspot_improvements
                .map((entry) => ({ ...entry })),
              structural_changes: [...state.runtime.last_validation.refactor_impact_report.structural_changes]
            }
          } : {})
        }
        : null,
      failure_metadata: state.runtime.failure_metadata
        ? { ...state.runtime.failure_metadata }
        : null,
      bootstrap: {
        ...state.runtime.bootstrap
      },
      timestamps: {
        ...state.runtime.timestamps
      }
    }
  };
}

function nextStage(currentStage: FlowStage): FlowStage | null {
  const index = STAGE_ORDER.indexOf(currentStage);
  if (index === -1) {
    return null;
  }

  return STAGE_ORDER[index + 1] ?? null;
}

function pendingState(stage: FlowStage): ProdifyState['runtime']['current_state'] {
  return `${stage}_pending` as ProdifyState['runtime']['current_state'];
}

function completeState(stage: FlowStage): ProdifyState['runtime']['current_state'] {
  return `${stage}_complete` as ProdifyState['runtime']['current_state'];
}

function assertAgent(agent: RuntimeProfileName): void {
  if (!isRuntimeProfileName(agent)) {
    throw new ProdifyError(`Unknown target agent: ${agent}`, {
      code: 'UNKNOWN_TARGET'
    });
  }
}

function assertMode(mode: ExecutionMode): void {
  if (!['interactive', 'auto'].includes(mode)) {
    throw new ProdifyError(`Unsupported runtime mode: ${mode}`, {
      code: 'INVALID_RUNTIME_MODE'
    });
  }
}

function ensureStageCheckpoint(state: ProdifyState): FlowStage {
  if (!state.runtime.current_stage) {
    throw new ProdifyError('Cannot complete a runtime stage when no stage is active.', {
      code: 'RUNTIME_STAGE_MISSING'
    });
  }

  return state.runtime.current_stage;
}

export function stageToTaskId(stage: FlowStage): string {
  return STAGE_TASK_IDS[stage];
}

export function bootstrapFlowState(
  state: ProdifyState,
  { agent, mode = 'interactive', now = null }: { agent: RuntimeProfileName; mode?: ExecutionMode; now?: string | null }
): ProdifyState {
  assertAgent(agent);
  assertMode(mode);

  const nextState = cloneState(state);
  nextState.runtime.status = RUNTIME_STATUS.READY;
  nextState.runtime.current_state = 'bootstrapped';
  nextState.runtime.mode = mode;
  nextState.runtime.current_stage = null;
  nextState.runtime.current_task_id = null;
  nextState.runtime.pending_stage = STAGE_ORDER[0];
  nextState.runtime.completed_stages = [];
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.last_validation_result = 'unknown';
  nextState.runtime.last_validation = null;
  nextState.runtime.last_validated_contract_versions = {};
  nextState.runtime.resumable = true;
  nextState.runtime.blocked_reason = null;
  nextState.runtime.failure_metadata = null;
  nextState.runtime.bootstrap = {
    bootstrapped: true
  };
  nextState.runtime.next_action = mode === 'auto' ? '$prodify-execute --auto' : '$prodify-execute';
  nextState.runtime.timestamps.bootstrapped_at = nextState.runtime.timestamps.bootstrapped_at ?? now;
  nextState.runtime.timestamps.last_transition_at = now;
  nextState.runtime.timestamps.completed_at = null;

  return nextState;
}

export function startFlowExecution(
  state: ProdifyState,
  { mode = state.runtime.mode ?? 'interactive', now = null }: { mode?: ExecutionMode; now?: string | null } = {}
): ProdifyState {
  assertMode(mode);

  const nextState = cloneState(state);
  nextState.runtime.mode = mode;

  if (nextState.runtime.current_state === 'validate_complete') {
    nextState.runtime.status = RUNTIME_STATUS.COMPLETE;
    nextState.runtime.current_state = 'completed';
    nextState.runtime.current_stage = null;
    nextState.runtime.current_task_id = null;
    nextState.runtime.pending_stage = null;
    nextState.runtime.awaiting_user_validation = false;
    nextState.runtime.resumable = false;
    nextState.runtime.next_action = 'none';
    nextState.runtime.timestamps.completed_at = now;
    nextState.runtime.timestamps.last_transition_at = now;
    return nextState;
  }

  const stage = nextState.runtime.pending_stage;
  if (!stage) {
    throw new ProdifyError('Cannot start flow execution without a pending stage.', {
      code: 'RUNTIME_STAGE_MISSING'
    });
  }

  nextState.runtime.status = RUNTIME_STATUS.RUNNING;
  nextState.runtime.current_state = pendingState(stage);
  nextState.runtime.current_stage = stage;
  nextState.runtime.current_task_id = stageToTaskId(stage);
  nextState.runtime.pending_stage = null;
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.blocked_reason = null;
  nextState.runtime.failure_metadata = null;
  nextState.runtime.next_action = '$prodify-resume';
  nextState.runtime.resumable = true;
  nextState.runtime.timestamps.last_transition_at = now;

  return nextState;
}

export function completeFlowStage(
  state: ProdifyState,
  {
    validation,
    now = null
  }: {
    validation: StageValidationResult;
    now?: string | null;
  }
): ProdifyState {
  const currentStage = ensureStageCheckpoint(state);
  if (validation.stage !== currentStage) {
    throw new ProdifyError(`Validation result stage ${validation.stage} does not match active stage ${currentStage}.`, {
      code: 'VALIDATION_STAGE_MISMATCH'
    });
  }

  if (!validation.passed) {
    return failFlowStage(state, {
      reason: validation.violated_rules.map((issue) => issue.message).join('; ') || 'stage validation failed',
      validation,
      now
    });
  }

  const nextState = cloneState(state);
  if (!nextState.runtime.completed_stages.includes(currentStage)) {
    nextState.runtime.completed_stages.push(currentStage);
  }

  nextState.runtime.last_validation_result = 'pass';
  nextState.runtime.last_validation = validation;
  nextState.runtime.last_validated_contract_versions[currentStage] = validation.contract_version;
  nextState.runtime.blocked_reason = null;
  nextState.runtime.failure_metadata = null;
  nextState.runtime.timestamps.last_transition_at = now;

  const upcomingStage = nextStage(currentStage);
  if (!upcomingStage) {
    nextState.runtime.current_state = 'validate_complete';
    nextState.runtime.current_stage = currentStage;
    nextState.runtime.current_task_id = stageToTaskId(currentStage);
    nextState.runtime.pending_stage = null;

    if (nextState.runtime.mode === 'interactive') {
      nextState.runtime.status = RUNTIME_STATUS.AWAITING_VALIDATION;
      nextState.runtime.awaiting_user_validation = true;
      nextState.runtime.resumable = true;
      nextState.runtime.next_action = '$prodify-resume';
      return nextState;
    }

    return startFlowExecution(nextState, {
      mode: nextState.runtime.mode ?? 'auto',
      now
    });
  }

  if (nextState.runtime.mode === 'interactive') {
    nextState.runtime.status = RUNTIME_STATUS.AWAITING_VALIDATION;
    nextState.runtime.current_state = completeState(currentStage);
    nextState.runtime.current_stage = currentStage;
    nextState.runtime.current_task_id = stageToTaskId(currentStage);
    nextState.runtime.pending_stage = upcomingStage;
    nextState.runtime.awaiting_user_validation = true;
    nextState.runtime.resumable = true;
    nextState.runtime.next_action = '$prodify-resume';
    return nextState;
  }

  nextState.runtime.status = RUNTIME_STATUS.READY;
  nextState.runtime.current_state = pendingState(upcomingStage);
  nextState.runtime.current_stage = upcomingStage;
  nextState.runtime.current_task_id = stageToTaskId(upcomingStage);
  nextState.runtime.pending_stage = null;
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.resumable = true;
  nextState.runtime.next_action = '$prodify-execute --auto';
  return nextState;
}

export function failFlowStage(
  state: ProdifyState,
  {
    reason,
    validation = null,
    now = null
  }: {
    reason: string;
    validation?: StageValidationResult | null;
    now?: string | null;
  }
): ProdifyState {
  const nextState = cloneState(state);
  nextState.runtime.status = RUNTIME_STATUS.FAILED;
  nextState.runtime.current_state = 'failed';
  nextState.runtime.blocked_reason = reason;
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.resumable = false;
  nextState.runtime.next_action = 'repair runtime state';
  nextState.runtime.last_validation_result = validation ? 'fail' : nextState.runtime.last_validation_result;
  nextState.runtime.last_validation = validation;
  nextState.runtime.failure_metadata = {
    stage: validation?.stage ?? nextState.runtime.current_stage,
    contract_version: validation?.contract_version ?? null,
    reason
  };
  nextState.runtime.timestamps.last_transition_at = now;
  return nextState;
}

export function getResumeDecision(state: ProdifyState): ResumeDecision {
  const runtime = state.runtime;

  if (runtime.current_state === 'completed' || runtime.status === RUNTIME_STATUS.COMPLETE) {
    return {
      resumable: false,
      command: null,
      reason: 'flow complete'
    };
  }

  if (runtime.current_state === 'failed' || runtime.current_state === 'blocked') {
    return {
      resumable: false,
      command: null,
      reason: runtime.blocked_reason ?? 'runtime is blocked'
    };
  }

  if (!runtime.resumable) {
    return {
      resumable: false,
      command: null,
      reason: runtime.blocked_reason ?? 'runtime not bootstrapped'
    };
  }

  if (runtime.status === RUNTIME_STATUS.READY) {
    return {
      resumable: true,
      command: runtime.mode === 'auto' ? '$prodify-execute --auto' : '$prodify-execute',
      reason: runtime.pending_stage
        ? `ready for ${runtime.pending_stage}`
        : runtime.current_state
    };
  }

  return {
    resumable: true,
    command: '$prodify-resume',
    reason: runtime.current_state
  };
}
