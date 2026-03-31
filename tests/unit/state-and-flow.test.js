import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapFlowState, completeFlowStage, getResumeDecision, stageToTaskId, startFlowExecution } from '../../src/core/flow-state.js';
import { buildExecutionPrompt, buildRuntimeCommandReference } from '../../src/core/prompt-builder.js';
import { createInitialRuntimeState } from '../../src/core/state.js';

const presetMetadata = {
  name: 'default',
  version: '2.0.0'
};

test('runtime bootstrap initializes the first stage deterministically', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive',
    now: '2026-03-31T00:00:00.000Z'
  });

  assert.equal(bootstrapped.primary_agent, 'codex');
  assert.equal(bootstrapped.runtime.status, 'ready');
  assert.equal(bootstrapped.runtime.current_stage, 'understand');
  assert.equal(bootstrapped.runtime.current_task_id, '01-understand');
  assert.equal(bootstrapped.runtime.next_action, '$prodify-execute');
});

test('interactive execution pauses between stages and resumes with $prodify-resume', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  const paused = completeFlowStage(running);

  assert.equal(paused.runtime.status, 'awaiting_validation');
  assert.equal(paused.runtime.current_stage, 'diagnose');
  assert.equal(paused.runtime.current_task_id, '02-diagnose');
  assert.equal(paused.runtime.next_action, '$prodify-resume');
  assert.deepEqual(paused.runtime.completed_stages, ['understand']);
  assert.deepEqual(getResumeDecision(paused), {
    resumable: true,
    command: '$prodify-resume',
    reason: 'awaiting_validation at diagnose'
  });
});

test('auto execution advances to the next stage without a validation pause', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'auto'
  });
  const running = startFlowExecution(bootstrapped, {
    mode: 'auto'
  });
  const advanced = completeFlowStage(running);

  assert.equal(advanced.runtime.status, 'ready');
  assert.equal(advanced.runtime.current_stage, 'diagnose');
  assert.equal(advanced.runtime.next_action, '$prodify-execute --auto');
});

test('prompt builder includes runtime commands and current task context', () => {
  const state = createInitialRuntimeState({ presetMetadata });
  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });

  assert.match(buildRuntimeCommandReference(), /\$prodify-init/);
  assert.match(buildRuntimeCommandReference({ concise: true }), /\$prodify-resume/);
  assert.match(buildExecutionPrompt(bootstrapped), /Current task: 01-understand/);
  assert.equal(stageToTaskId('validate'), '06-validate');
});
