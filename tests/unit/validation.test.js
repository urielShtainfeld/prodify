import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { loadCompiledContract } from '../../dist/contracts/compiler.js';
import { bootstrapFlowState, startFlowExecution } from '../../dist/core/flow-state.js';
import { readRuntimeState } from '../../dist/core/state.js';
import { validateStageOutputs } from '../../dist/core/validation.js';
import { createTempRepo, memoryStream } from './helpers.js';

async function execCli(repoRoot, args) {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const exitCode = await runCli(args, { cwd: repoRoot, stdout, stderr });
  return { exitCode, stdout: stdout.toString(), stderr: stderr.toString() };
}

test('valid stage outputs pass compiled contract validation', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const state = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });
  const running = startFlowExecution(bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  }));
  const artifactPath = path.join(repoRoot, '.prodify', 'artifacts', '01-understand.md');

  await fs.writeFile(artifactPath, `# Understand\n\n## Repository Summary\nRepo summary.\n\n## Current State\nCurrent state.\n\n## Open Questions\nOpen questions.\n\n## Policy Checks\n- Operate only on verified data.\n- Preserve the existing behavior during understanding.\n\n## Success Criteria\n- The repository intent is captured clearly.\n- Known unknowns are listed explicitly.\n`, 'utf8');

  const result = await validateStageOutputs(repoRoot, {
    contract: await loadCompiledContract(repoRoot, 'understand'),
    runtimeState: running,
    touchedPaths: ['.prodify/artifacts/01-understand.md']
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.violated_rules, []);
});

test('missing artifacts and forbidden writes fail contract validation deterministically', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const state = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });
  const running = startFlowExecution(bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  }));
  const result = await validateStageOutputs(repoRoot, {
    contract: await loadCompiledContract(repoRoot, 'understand'),
    runtimeState: running,
    touchedPaths: ['src/index.ts']
  });

  assert.equal(result.passed, false);
  assert.match(result.violated_rules.map((issue) => issue.rule).join(','), /artifact\/missing/);
  assert.match(result.violated_rules.map((issue) => issue.rule).join(','), /writes\/forbidden/);
});
