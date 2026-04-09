import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { loadCompiledContract } from '../../dist/contracts/compiler.js';
import { bootstrapFlowState, startFlowExecution } from '../../dist/core/flow-state.js';
import { diffAgainstRefactorBaseline } from '../../dist/core/diff-validator.js';
import { readRuntimeState, writeRuntimeState } from '../../dist/core/state.js';
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

test('refactor validation enforces plan units, diff thresholds, and structural changes', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await fs.mkdir(path.join(repoRoot, 'src'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'src', 'legacy.ts'), `export function legacyFlow() {\n  const record = loadLegacy();\n  const normalized = normalizeLegacy(record);\n  const payload = buildLegacyPayload(normalized);\n  return payload;\n}\n`, 'utf8');

  const state = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });

  const refactorState = bootstrapFlowState(state, {
    agent: 'codex',
    mode: 'interactive'
  });
  refactorState.runtime.current_state = 'refactor_pending';
  refactorState.runtime.current_stage = 'refactor';
  refactorState.runtime.current_task_id = '05-refactor';
  await writeRuntimeState(repoRoot, refactorState);

  await fs.writeFile(path.join(repoRoot, '.prodify', 'artifacts', '04-plan.md'), `# 04-plan\n\n## Policy Checks\n- Keep the plan deterministic and minimal.\n- Map every step back to a diagnosed issue or architecture rule.\n\n## Risks\n- low\n\n## Step Breakdown\n- Step ID: step-01-extract-service\n  - Description: extract service module from legacy flow.\n  - Files: src/legacy.ts, src/services/legacy-service.ts\n  - Risk: 2\n  - Validation: npm test\n\n## Success Criteria\n- The plan enumerates executable steps.\n- Verification is defined before refactoring starts.\n\n## Verification\n- npm test\n`, 'utf8');
  await fs.writeFile(path.join(repoRoot, '.prodify', 'artifacts', '05-refactor.md'), `# 05-refactor\n\n## Behavior Guardrails\n- keep the change scoped to one plan unit.\n\n## Changed Files\n- src/legacy.ts\n- src/services/legacy-service.ts\n\n## Policy Checks\n- Execute exactly one selected step.\n- Keep the diff minimal and behavior-preserving unless the plan says otherwise.\n\n## Selected Step\n- Step ID: step-01-extract-service\n- Description: extract service module from legacy flow.\n\n## Success Criteria\n- The selected plan step is implemented fully.\n- Unrelated files remain untouched.\n- The refactor introduces measurable structural improvement.\n`, 'utf8');

  await fs.mkdir(path.join(repoRoot, 'src', 'services'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'src', 'legacy.ts'), `import { loadLegacyService } from './services/legacy-service.js';\n\nexport function legacyFlow() {\n  return loadLegacyService();\n}\n`, 'utf8');
  await fs.writeFile(path.join(repoRoot, 'src', 'services', 'legacy-service.ts'), `export function loadLegacyService() {\n  const record = loadLegacy();\n  const normalized = normalizeLegacy(record);\n  return buildLegacyPayload(normalized);\n}\n`, 'utf8');

  const diffResult = await diffAgainstRefactorBaseline(repoRoot);
  const result = await validateStageOutputs(repoRoot, {
    contract: await loadCompiledContract(repoRoot, 'refactor'),
    runtimeState: refactorState,
    touchedPaths: ['src/legacy.ts', 'src/services/legacy-service.ts', '.prodify/artifacts/05-refactor.md'],
    diffResult
  });

  assert.equal(result.passed, true);
  assert.equal(result.diff_result?.filesAdded, 1);
  assert.match(result.diff_result?.structuralChanges.structural_change_flags.join(',') ?? '', /module-boundary-created/);
});

test('validate stage fails when impact score delta is below the configured threshold', async () => {
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

  const validateState = startFlowExecution(bootstrapped);
  validateState.runtime.current_state = 'validate_pending';
  validateState.runtime.current_stage = 'validate';
  validateState.runtime.current_task_id = '06-validate';
  await fs.writeFile(path.join(repoRoot, '.prodify', 'artifacts', '06-validate.md'), `# 06-validate\n\n## Policy Checks\n- Validation must follow every refactor step.\n- Critical regressions block forward progress.\n\n## Regressions\n- none observed\n\n## Success Criteria\n- Validation records whether regressions were found.\n- The result is strong enough to gate the next runtime transition.\n- The measured impact score exceeds the minimum threshold.\n\n## Validation Results\n- baseline and current score compared\n`, 'utf8');

  const result = await validateStageOutputs(repoRoot, {
    contract: await loadCompiledContract(repoRoot, 'validate'),
    runtimeState: validateState,
    touchedPaths: ['.prodify/artifacts/06-validate.md']
  });

  assert.equal(result.passed, false);
  assert.match(result.violated_rules.map((issue) => issue.rule).join(','), /impact-score\/minimum-threshold/);
});
