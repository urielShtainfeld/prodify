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

test('prompt builder includes runtime commands and current contract checkpoint context', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });

  assert.match(buildRuntimeCommandReference(), /prodify setup-agent <agent>/);
  assert.match(buildRuntimeCommandReference(), /\.prodify\/contracts\/\*\.contract\.json/);
  assert.match(buildRuntimeCommandReference({ concise: true }), /\$prodify-resume/);
  assert.match(buildBootstrapPrompt('codex'), /Read \.prodify\/AGENTS\.md/);
  assert.match(buildBootstrapPrompt('claude'), /Read \.prodify\/AGENTS\.md/);
  assert.match(buildBootstrapPrompt('copilot'), /Read \.prodify\/AGENTS\.md/);
  assert.match(buildBootstrapPrompt('opencode'), /Read \.prodify\/AGENTS\.md/);
  assert.match(buildExecutionPrompt(bootstrapped), /Current task: 01-understand/);
  assert.equal(stageToTaskId('validate'), '06-validate');
});
