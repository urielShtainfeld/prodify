import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { bootstrapFlowState, startFlowExecution } from '../../dist/core/flow-state.js';
import { readRuntimeState, writeRuntimeState } from '../../dist/core/state.js';
import { writeScoreDelta, writeScoreSnapshot } from '../../dist/scoring/model.js';
import { createTempRepo, memoryStream } from './helpers.js';

async function execCli(repoRoot, args) {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const exitCode = await runCli(args, { cwd: repoRoot, stdout, stderr });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
}

test('baseline, final, and delta score artifacts are written under .prodify/metrics', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const state = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });
  const baselineState = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  const finalState = startFlowExecution(baselineState);
  finalState.runtime.current_state = 'validate_complete';
  finalState.runtime.current_stage = 'validate';
  finalState.runtime.current_task_id = '06-validate';
  finalState.runtime.last_validation = {
    stage: 'validate',
    contract_version: '1.0.0',
    passed: true,
    violated_rules: [],
    missing_artifacts: [],
    warnings: [],
    diagnostics: ['ok']
  };
  finalState.runtime.last_validation_result = 'pass';

  const baseline = await writeScoreSnapshot(repoRoot, {
    kind: 'baseline',
    runtimeState: baselineState
  });
  const final = await writeScoreSnapshot(repoRoot, {
    kind: 'final',
    runtimeState: finalState
  });
  const delta = await writeScoreDelta(repoRoot);

  assert.equal(typeof baseline.total_score, 'number');
  assert.equal(typeof final.total_score, 'number');
  assert.equal(typeof baseline.breakdown.structure, 'number');
  assert.equal(typeof final.signals.average_function_length, 'number');
  assert.equal(delta.delta, Number((final.total_score - baseline.total_score).toFixed(2)));
  assert.equal(typeof delta.breakdown_delta.structure, 'number');
  assert.ok(Array.isArray(delta.regressed_categories));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'baseline.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'baseline.score.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'final.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'final.score.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'delta.json'));
});

test('runtime state writes refresh baseline and final scoring artifacts automatically', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const state = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });

  const bootstrapped = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  await writeRuntimeState(repoRoot, bootstrapped);

  const finalState = startFlowExecution(bootstrapped);
  finalState.runtime.current_state = 'validate_complete';
  finalState.runtime.current_stage = 'validate';
  finalState.runtime.current_task_id = '06-validate';
  finalState.runtime.last_validation = {
    stage: 'validate',
    contract_version: '1.0.0',
    passed: true,
    violated_rules: [],
    missing_artifacts: [],
    warnings: [],
    diagnostics: ['ok']
  };
  finalState.runtime.last_validation_result = 'pass';
  await writeRuntimeState(repoRoot, finalState);

  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'baseline.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'baseline.score.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'final.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'final.score.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'delta.json'));
});
