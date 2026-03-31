import { ProdifyError } from './errors.js';
import { isRuntimeProfileName } from './paths.js';
import { RUNTIME_STATUS } from './state.js';
import type {
  ExecutionMode,
  FlowStage,
  ProdifyState,
  ResumeDecision,
  RuntimeProfileName,
  ValidationResult
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
  nextState.primary_agent = agent;
  nextState.runtime.status = RUNTIME_STATUS.READY;
  nextState.runtime.mode = mode;
  nextState.runtime.selected_agent = agent;
  nextState.runtime.current_stage = STAGE_ORDER[0];
  nextState.runtime.current_task_id = stageToTaskId(STAGE_ORDER[0]);
  nextState.runtime.completed_stages = [];
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.last_validation_result = 'unknown';
  nextState.runtime.resumable = true;
  nextState.runtime.blocked_reason = null;
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
  nextState.runtime.status = RUNTIME_STATUS.RUNNING;
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.blocked_reason = null;
  nextState.runtime.next_action = '$prodify-resume';
  nextState.runtime.resumable = true;
  nextState.runtime.timestamps.last_transition_at = now;

  return nextState;
}

export function completeFlowStage(
  state: ProdifyState,
  { validationResult = 'unknown', now = null }: { validationResult?: ValidationResult; now?: string | null } = {}
): ProdifyState {
  if (!state.runtime.current_stage) {
    throw new ProdifyError('Cannot complete a runtime stage when no stage is active.', {
      code: 'RUNTIME_STAGE_MISSING'
    });
  }

  const nextState = cloneState(state);
  const finishedStage = nextState.runtime.current_stage as FlowStage;

  if (!nextState.runtime.completed_stages.includes(finishedStage)) {
    nextState.runtime.completed_stages.push(finishedStage);
  }

  const upcomingStage = nextStage(finishedStage);

  if (!upcomingStage) {
    nextState.runtime.status = RUNTIME_STATUS.COMPLETE;
    nextState.runtime.current_stage = null;
    nextState.runtime.current_task_id = null;
    nextState.runtime.awaiting_user_validation = false;
    nextState.runtime.resumable = false;
    nextState.runtime.next_action = 'none';
    nextState.runtime.last_validation_result = validationResult;
    nextState.runtime.timestamps.completed_at = now;
    nextState.runtime.timestamps.last_transition_at = now;
    return nextState;
  }

  nextState.runtime.current_stage = upcomingStage;
  nextState.runtime.current_task_id = stageToTaskId(upcomingStage);
  nextState.runtime.timestamps.last_transition_at = now;

  if (nextState.runtime.mode === 'interactive') {
    nextState.runtime.status = RUNTIME_STATUS.AWAITING_VALIDATION;
    nextState.runtime.awaiting_user_validation = true;
    nextState.runtime.next_action = '$prodify-resume';
  } else {
    nextState.runtime.status = RUNTIME_STATUS.READY;
    nextState.runtime.awaiting_user_validation = false;
    nextState.runtime.next_action = '$prodify-execute --auto';
  }

  if (finishedStage === 'validate') {
    nextState.runtime.last_validation_result = validationResult;
  }

  return nextState;
}

export function failFlowStage(
  state: ProdifyState,
  { reason, now = null }: { reason: string; now?: string | null }
): ProdifyState {
  const nextState = cloneState(state);
  nextState.runtime.status = RUNTIME_STATUS.FAILED;
  nextState.runtime.blocked_reason = reason;
  nextState.runtime.awaiting_user_validation = false;
  nextState.runtime.resumable = true;
  nextState.runtime.next_action = '$prodify-resume';
  nextState.runtime.timestamps.last_transition_at = now;
  return nextState;
}

export function getResumeDecision(state: ProdifyState): ResumeDecision {
  const runtime = state.runtime;

  if (runtime.status === RUNTIME_STATUS.COMPLETE) {
    return {
      resumable: false,
      command: null,
      reason: 'flow complete'
    };
  }

  if (!runtime.resumable) {
    return {
      resumable: false,
      command: null,
      reason: runtime.blocked_reason ?? 'runtime not bootstrapped'
    };
  }

  return {
    resumable: true,
    command: runtime.status === RUNTIME_STATUS.READY
      ? (runtime.mode === 'auto' ? '$prodify-execute --auto' : '$prodify-execute')
      : '$prodify-resume',
    reason: runtime.blocked_reason ?? `${runtime.status} at ${runtime.current_stage ?? 'none'}`
  };
}
