import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapFlowState, completeFlowStage, failFlowStage, getResumeDecision, stageToTaskId, startFlowExecution } from '../../dist/core/flow-state.js';
import { buildBootstrapPrompt, buildExecutionPrompt, buildRuntimeCommandReference } from '../../dist/core/prompt-builder.js';
import { createInitialRuntimeState } from '../../dist/core/state.js';

const presetMetadata = {
  name: 'default',
  version: '4.0.0',
  schemaVersion: '4'
};

function passingValidation(stage) {
  return {
    stage,
    contract_version: '1.0.0',
    passed: true,
    violated_rules: [],
    missing_artifacts: [],
    warnings: [],
    diagnostics: ['ok']
  };
}

function failingValidation(stage, rules = ['diff/minimum-lines-changed']) {
  return {
    stage,
    contract_version: '1.0.0',
    passed: false,
    violated_rules: rules.map((rule) => ({
      rule,
      message: rule,
      path: undefined
    })),
    missing_artifacts: [],
    warnings: [],
    diagnostics: ['retry'],
    unmet_requirements: rules.map((rule) => ({
      rule,
      message: rule,
      path: undefined
    })),
    enforcement_action: 'retry'
  };
}

test('runtime bootstrap initializes the bootstrapped checkpoint deterministically', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive',
    now: '2026-03-31T00:00:00.000Z'
  });

  assert.equal(bootstrapped.runtime.status, 'ready');
  assert.equal(bootstrapped.runtime.current_state, 'bootstrapped');
  assert.equal(bootstrapped.runtime.pending_stage, 'understand');
  assert.equal(bootstrapped.runtime.current_stage, null);
  assert.equal(bootstrapped.runtime.next_action, '$prodify-execute');
  assert.deepEqual(bootstrapped.runtime.bootstrap, {
    bootstrapped: true
  });
});

test('interactive execution pauses on a stage-complete checkpoint and resumes with $prodify-resume', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  const paused = completeFlowStage(running, {
    validation: passingValidation('understand')
  });

  assert.equal(paused.runtime.status, 'awaiting_validation');
  assert.equal(paused.runtime.current_state, 'understand_complete');
  assert.equal(paused.runtime.current_stage, 'understand');
  assert.equal(paused.runtime.pending_stage, 'diagnose');
  assert.equal(paused.runtime.current_task_id, '01-understand');
  assert.equal(paused.runtime.next_action, '$prodify-resume');
  assert.deepEqual(paused.runtime.completed_stages, ['understand']);
  assert.deepEqual(getResumeDecision(paused), {
    resumable: true,
    command: '$prodify-resume',
    reason: 'understand_complete'
  });
});

test('auto execution advances to the next pending stage without a validation pause', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'auto'
  });
  const running = startFlowExecution(bootstrapped, {
    mode: 'auto'
  });
  const advanced = completeFlowStage(running, {
    validation: passingValidation('understand')
  });

  assert.equal(advanced.runtime.status, 'ready');
  assert.equal(advanced.runtime.current_state, 'diagnose_pending');
  assert.equal(advanced.runtime.current_stage, 'diagnose');
  assert.equal(advanced.runtime.next_action, '$prodify-execute --auto');
});

test('failed validation produces a non-resumable failed checkpoint', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  const failed = failFlowStage(running, {
    reason: 'missing artifact'
  });

  assert.equal(failed.runtime.current_state, 'failed');
  assert.equal(failed.runtime.resumable, false);
  assert.equal(getResumeDecision(failed).resumable, false);
});

test('refactor failures enter a resumable enforcement loop before hard stop', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  running.runtime.current_stage = 'refactor';
  running.runtime.current_state = 'refactor_pending';
  running.runtime.current_task_id = '05-refactor';

  const blocked = failFlowStage(running, {
    reason: 'diff too weak',
    validation: failingValidation('refactor')
  });

  assert.equal(blocked.runtime.current_state, 'blocked');
  assert.equal(blocked.runtime.resumable, true);
  assert.equal(blocked.runtime.enforcement_loop.stage, 'refactor');
  assert.equal(blocked.runtime.enforcement_loop.retry_count, 1);
  assert.equal(getResumeDecision(blocked).command, '$prodify-execute');

  const retried = startFlowExecution(blocked);
  assert.equal(retried.runtime.current_state, 'refactor_pending');
  assert.equal(retried.runtime.current_stage, 'refactor');
});

test('repeated enforcement failures eventually hard-stop the runtime', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  running.runtime.current_stage = 'validate';
  running.runtime.current_state = 'validate_pending';
  running.runtime.current_task_id = '06-validate';

  const first = failFlowStage(running, {
    reason: 'score delta too low',
    validation: failingValidation('validate', ['impact-score/minimum-threshold'])
  });
  const second = failFlowStage(startFlowExecution(first), {
    reason: 'score delta too low',
    validation: failingValidation('validate', ['impact-score/minimum-threshold'])
  });
  const third = failFlowStage(startFlowExecution(second), {
    reason: 'score delta too low',
    validation: failingValidation('validate', ['impact-score/minimum-threshold'])
  });

  assert.equal(third.runtime.current_state, 'failed');
  assert.equal(third.runtime.resumable, false);
  assert.equal(third.runtime.enforcement_loop.retry_count, 3);
  assert.equal(third.runtime.enforcement_loop.can_retry, false);
});

test('prompt builder includes runtime commands and current contract checkpoint context', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });

  assert.match(buildRuntimeCommandReference(), /prodify setup-agent <agent>/);
  assert.match(buildRuntimeCommandReference(), /\.prodify\/contracts\/\*\.contract\.json/);
  assert.match(buildRuntimeCommandReference(), /\.prodify\/runtime\/bootstrap\.json/);
  assert.match(buildRuntimeCommandReference({ concise: true }), /\$prodify-resume/);
  assert.match(buildBootstrapPrompt('codex'), /Open this repository in Codex and run `\$prodify-init`\./);
  assert.match(buildBootstrapPrompt('claude'), /Open this repository in Claude and run `\$prodify-init`\./);
  assert.match(buildBootstrapPrompt('copilot'), /Open this repository in Copilot and run `\$prodify-init`\./);
  assert.match(buildBootstrapPrompt('opencode'), /Open this repository in OpenCode and run `\$prodify-init`\./);
  assert.match(buildExecutionPrompt(bootstrapped), /Current task: 01-understand/);
  assert.equal(stageToTaskId('validate'), '06-validate');
});
