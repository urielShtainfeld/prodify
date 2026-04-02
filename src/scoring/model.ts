import fs from 'node:fs/promises';
import path from 'node:path';

import { inspectCompiledContracts } from '../contracts/freshness.js';
import { ProdifyError } from '../core/errors.js';
import { listFilesRecursive, pathExists, writeFileEnsuringDir } from '../core/fs.js';
import { resolveRepoPath } from '../core/paths.js';
import type { ProdifyState, ScoreDelta, ScoreMetric, ScoreSnapshot, ScoreSnapshotKind } from '../types.js';

const SCORE_SCHEMA_VERSION = '1';

interface ToolOutput {
  adapter: string;
  details: Record<string, unknown>;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function createMetric(options: {
  id: string;
  label: string;
  tool: string;
  weight: number;
  ratio: number;
  details: string;
}): ScoreMetric {
  const ratio = Math.max(0, Math.min(1, options.ratio));
  const points = roundScore(options.weight * ratio);
  return {
    id: options.id,
    label: options.label,
    tool: options.tool,
    weight: options.weight,
    max_points: options.weight,
    points,
    status: ratio === 1 ? 'pass' : ratio === 0 ? 'fail' : 'partial',
    details: options.details
  };
}

async function detectEcosystems(repoRoot: string): Promise<string[]> {
  const ecosystems = [];
  if (await pathExists(resolveRepoPath(repoRoot, 'package.json'))) {
    ecosystems.push('typescript-javascript');
  }

  const repoFiles = await listFilesRecursive(repoRoot);
  if (repoFiles.some((file) => file.relativePath.endsWith('.py'))) {
    ecosystems.push('python');
  }

  if (repoFiles.some((file) => file.relativePath.endsWith('.cs') || file.relativePath.endsWith('.csproj') || file.relativePath.endsWith('.sln'))) {
    ecosystems.push('csharp');
  }

  return ecosystems.sort((left, right) => left.localeCompare(right));
}

async function buildEcosystemMetrics(repoRoot: string, ecosystems: string[]): Promise<{ metrics: ScoreMetric[]; toolOutputs: ToolOutput[] }> {
  const metrics: ScoreMetric[] = [];
  const toolOutputs: ToolOutput[] = [];

  if (ecosystems.includes('typescript-javascript')) {
    const packageJsonPath = resolveRepoPath(repoRoot, 'package.json');
    const tsconfigPath = resolveRepoPath(repoRoot, 'tsconfig.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};
    const hasBuild = typeof scripts.build === 'string' && scripts.build.length > 0;
    const hasTest = typeof scripts.test === 'string' && scripts.test.length > 0;
    const hasTsconfig = await pathExists(tsconfigPath);
    const score = [hasBuild, hasTest, hasTsconfig].filter(Boolean).length / 3;

    metrics.push(createMetric({
      id: 'typescript-javascript',
      label: 'TypeScript/JavaScript local tooling',
      tool: 'package-json',
      weight: 15,
      ratio: score,
      details: `build=${hasBuild}, test=${hasTest}, tsconfig=${hasTsconfig}`
    }));
    toolOutputs.push({
      adapter: 'typescript-javascript',
      details: {
        build_script: hasBuild,
        test_script: hasTest,
        tsconfig: hasTsconfig
      }
    });
  }

  if (ecosystems.includes('python')) {
    const hasPyproject = await pathExists(resolveRepoPath(repoRoot, 'pyproject.toml'));
    const hasRequirements = await pathExists(resolveRepoPath(repoRoot, 'requirements.txt'));
    const ratio = [hasPyproject, hasRequirements].filter(Boolean).length / 2;

    metrics.push(createMetric({
      id: 'python',
      label: 'Python local tooling',
      tool: 'filesystem',
      weight: 7.5,
      ratio,
      details: `pyproject=${hasPyproject}, requirements=${hasRequirements}`
    }));
    toolOutputs.push({
      adapter: 'python',
      details: {
        pyproject: hasPyproject,
        requirements: hasRequirements
      }
    });
  }

  if (ecosystems.includes('csharp')) {
    const repoFiles = await listFilesRecursive(repoRoot);
    const hasSolution = repoFiles.some((file) => file.relativePath.endsWith('.sln'));
    const hasProject = repoFiles.some((file) => file.relativePath.endsWith('.csproj'));
    const ratio = [hasSolution, hasProject].filter(Boolean).length / 2;

    metrics.push(createMetric({
      id: 'csharp',
      label: 'C# local tooling',
      tool: 'filesystem',
      weight: 7.5,
      ratio,
      details: `solution=${hasSolution}, project=${hasProject}`
    }));
    toolOutputs.push({
      adapter: 'csharp',
      details: {
        solution: hasSolution,
        project: hasProject
      }
    });
  }

  return {
    metrics,
    toolOutputs
  };
}

async function buildRepoHygieneMetric(repoRoot: string): Promise<{ metric: ScoreMetric; toolOutput: ToolOutput }> {
  const requiredSignals = ['README.md', 'LICENSE', 'tests', '.prodify/contracts-src'];
  const available = await Promise.all(requiredSignals.map((relativePath) => pathExists(resolveRepoPath(repoRoot, relativePath))));
  const ratio = available.filter(Boolean).length / requiredSignals.length;

  return {
    metric: createMetric({
      id: 'repo-hygiene',
      label: 'Repository hygiene signals',
      tool: 'filesystem',
      weight: 20,
      ratio,
      details: requiredSignals.map((entry, index) => `${entry}=${available[index]}`).join(', ')
    }),
    toolOutput: {
      adapter: 'filesystem',
      details: Object.fromEntries(requiredSignals.map((entry, index) => [entry, available[index]]))
    }
  };
}

function buildRuntimeMetric(runtimeState: ProdifyState): { metric: ScoreMetric; toolOutput: ToolOutput } {
  const healthyState = runtimeState.runtime.current_state !== 'failed' && runtimeState.runtime.current_state !== 'blocked';
  const ratio = healthyState ? 1 : 0;

  return {
    metric: createMetric({
      id: 'runtime-state',
      label: 'Contract-driven runtime state',
      tool: 'state-json',
      weight: 25,
      ratio,
      details: `current_state=${runtimeState.runtime.current_state}, status=${runtimeState.runtime.status}`
    }),
    toolOutput: {
      adapter: 'state-json',
      details: {
        current_state: runtimeState.runtime.current_state,
        status: runtimeState.runtime.status,
        last_validation_result: runtimeState.runtime.last_validation_result
      }
    }
  };
}

function buildValidationMetric(runtimeState: ProdifyState): { metric: ScoreMetric; toolOutput: ToolOutput } {
  const passed = runtimeState.runtime.last_validation?.passed === true;
  const finalReady = runtimeState.runtime.current_state === 'validate_complete' || runtimeState.runtime.current_state === 'completed';
  const ratio = passed ? (finalReady ? 1 : 0.5) : 0;

  return {
    metric: createMetric({
      id: 'validation-gate',
      label: 'Validated contract completion',
      tool: 'state-json',
      weight: 10,
      ratio,
      details: `passed=${passed}, final_ready=${finalReady}`
    }),
    toolOutput: {
      adapter: 'validation-gate',
      details: {
        passed,
        final_ready: finalReady
      }
    }
  };
}

export async function calculateLocalScore(
  repoRoot: string,
  {
    kind,
    runtimeState
  }: {
    kind: ScoreSnapshotKind;
    runtimeState: ProdifyState;
  }
): Promise<{ snapshot: ScoreSnapshot; toolOutputs: ToolOutput[] }> {
  const contractInventory = await inspectCompiledContracts(repoRoot);
  const ecosystems = await detectEcosystems(repoRoot);
  const metrics: ScoreMetric[] = [];
  const toolOutputs: ToolOutput[] = [];

  metrics.push(createMetric({
    id: 'contracts',
    label: 'Compiled contract health',
    tool: 'contract-compiler',
    weight: 30,
    ratio: contractInventory.ok ? 1 : Math.max(0, 1 - ((contractInventory.missingCompiledStages.length + contractInventory.staleStages.length) / 6)),
    details: `source=${contractInventory.sourceCount}, compiled=${contractInventory.compiledCount}, stale=${contractInventory.staleStages.length}, missing=${contractInventory.missingCompiledStages.length}`
  }));
  toolOutputs.push({
    adapter: 'contract-compiler',
    details: {
      ok: contractInventory.ok,
      sourceCount: contractInventory.sourceCount,
      compiledCount: contractInventory.compiledCount,
      staleStages: contractInventory.staleStages,
      missingCompiledStages: contractInventory.missingCompiledStages,
      missingSourceStages: contractInventory.missingSourceStages,
      invalidStages: contractInventory.invalidStages
    }
  });

  const runtimeMetric = buildRuntimeMetric(runtimeState);
  metrics.push(runtimeMetric.metric);
  toolOutputs.push(runtimeMetric.toolOutput);

  const validationMetric = buildValidationMetric(runtimeState);
  metrics.push(validationMetric.metric);
  toolOutputs.push(validationMetric.toolOutput);

  const hygieneMetric = await buildRepoHygieneMetric(repoRoot);
  metrics.push(hygieneMetric.metric);
  toolOutputs.push(hygieneMetric.toolOutput);

  const ecosystemMetrics = await buildEcosystemMetrics(repoRoot, ecosystems);
  metrics.push(...ecosystemMetrics.metrics);
  toolOutputs.push(...ecosystemMetrics.toolOutputs);

  const totalScore = roundScore(metrics.reduce((sum, metric) => sum + metric.points, 0));
  const maxScore = roundScore(metrics.reduce((sum, metric) => sum + metric.max_points, 0));

  if (kind === 'final' && !(runtimeState.runtime.last_validation?.passed && (runtimeState.runtime.current_state === 'validate_complete' || runtimeState.runtime.current_state === 'completed'))) {
    throw new ProdifyError('Final scoring requires a validated runtime state at validate_complete or completed.', {
      code: 'SCORING_STATE_INVALID'
    });
  }

  return {
    snapshot: {
      schema_version: SCORE_SCHEMA_VERSION,
      kind,
      ecosystems,
      total_score: totalScore,
      max_score: maxScore,
      metrics
    },
    toolOutputs
  };
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeScoreSnapshot(
  repoRoot: string,
  {
    kind,
    runtimeState
  }: {
    kind: ScoreSnapshotKind;
    runtimeState: ProdifyState;
  }
): Promise<ScoreSnapshot> {
  const { snapshot, toolOutputs } = await calculateLocalScore(repoRoot, {
    kind,
    runtimeState
  });
  const metricsDir = resolveRepoPath(repoRoot, '.prodify/metrics');

  await writeFileEnsuringDir(path.join(metricsDir, `${kind}.score.json`), serializeJson(snapshot));
  await writeFileEnsuringDir(path.join(metricsDir, `${kind}.tools.json`), serializeJson({
    schema_version: SCORE_SCHEMA_VERSION,
    kind,
    outputs: toolOutputs
  }));

  return snapshot;
}

export async function writeScoreDelta(repoRoot: string): Promise<ScoreDelta> {
  const metricsDir = resolveRepoPath(repoRoot, '.prodify/metrics');
  const baseline = JSON.parse(await fs.readFile(path.join(metricsDir, 'baseline.score.json'), 'utf8')) as ScoreSnapshot;
  const final = JSON.parse(await fs.readFile(path.join(metricsDir, 'final.score.json'), 'utf8')) as ScoreSnapshot;
  const delta: ScoreDelta = {
    schema_version: SCORE_SCHEMA_VERSION,
    baseline_score: baseline.total_score,
    final_score: final.total_score,
    delta: roundScore(final.total_score - baseline.total_score)
  };

  await writeFileEnsuringDir(path.join(metricsDir, 'delta.json'), serializeJson(delta));
  return delta;
}
