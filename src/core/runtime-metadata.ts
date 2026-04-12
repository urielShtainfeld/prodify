import fs from 'node:fs/promises';

import { inspectCompiledContracts } from '../contracts/freshness.js';
import { loadCompiledContract } from '../contracts/compiler.js';
import { readRefactorBaselineSnapshot } from './diff-validator.js';
import { detectHotspots, detectHotspotsFromSnapshot, evaluateHotspotImprovements } from './hotspots.js';
import { readScoreDelta } from '../scoring/model.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { readPlanUnits, readSelectedRefactorStep } from './plan-units.js';
import { resolveCanonicalPath, resolveRepoPath } from './paths.js';
import { resolveStageSkills } from './skill-resolution.js';
import type {
  CompiledStageContract,
  FlowStage,
  ProdifyState,
  ScoreDelta,
  StageSkillResolution
} from '../types.js';

const RUNTIME_METADATA_SCHEMA_VERSION = '1';

const ARTIFACT_ORDER: Array<{ stage: FlowStage; taskId: string }> = [
  { stage: 'understand', taskId: '01-understand' },
  { stage: 'diagnose', taskId: '02-diagnose' },
  { stage: 'architecture', taskId: '03-architecture' },
  { stage: 'plan', taskId: '04-plan' },
  { stage: 'refactor', taskId: '05-refactor' },
  { stage: 'validate', taskId: '06-validate' }
];

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function currentStage(state: ProdifyState): FlowStage {
  return state.runtime.current_stage ?? state.runtime.pending_stage ?? 'understand';
}

async function readScoreSummary(repoRoot: string): Promise<{
  baseline_score: number | null;
  final_score: number | null;
  delta: ScoreDelta | null;
}> {
  const readTotalScore = async (relativePath: string): Promise<number | null> => {
    const fullPath = resolveRepoPath(repoRoot, relativePath);
    if (!(await pathExists(fullPath))) {
      return null;
    }

    try {
      const parsed = JSON.parse(await fs.readFile(fullPath, 'utf8')) as { total_score?: unknown };
      return typeof parsed.total_score === 'number' ? parsed.total_score : null;
    } catch {
      return null;
    }
  };

  return {
    baseline_score: await readTotalScore('.prodify/metrics/baseline.score.json'),
    final_score: await readTotalScore('.prodify/metrics/final.score.json'),
    delta: await readScoreDelta(repoRoot)
  };
}

function summarizeMarkdown(markdown: string): { headings: string[]; summary_lines: string[] } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const headings = lines
    .map((line) => /^#{1,6}\s+(.+)$/.exec(line)?.[1]?.trim() ?? null)
    .filter((line): line is string => Boolean(line))
    .slice(0, 8);
  const summaryLines = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('```'))
    .slice(0, 8);

  return {
    headings,
    summary_lines: summaryLines
  };
}

async function syncArtifactSummaries(repoRoot: string): Promise<Array<{
  stage: FlowStage;
  task_id: string;
  artifact_path: string;
  summary_path: string;
  headings: string[];
  summary_lines: string[];
}>> {
  const summaries = [];

  for (const entry of ARTIFACT_ORDER) {
    const artifactPath = `.prodify/artifacts/${entry.taskId}.md`;
    const summaryPath = `.prodify/artifacts/${entry.taskId}.summary.json`;
    const fullArtifactPath = resolveRepoPath(repoRoot, artifactPath);
    const fullSummaryPath = resolveRepoPath(repoRoot, summaryPath);

    if (!(await pathExists(fullArtifactPath))) {
      if (await pathExists(fullSummaryPath)) {
        await fs.rm(fullSummaryPath);
      }
      continue;
    }

    const markdown = await fs.readFile(fullArtifactPath, 'utf8');
    const summary = {
      schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
      stage: entry.stage,
      task_id: entry.taskId,
      artifact_path: artifactPath,
      ...summarizeMarkdown(markdown)
    };

    await writeFileEnsuringDir(fullSummaryPath, serializeJson(summary));
    summaries.push({
      ...summary,
      summary_path: summaryPath
    });
  }

  return summaries;
}

async function loadCurrentContract(repoRoot: string, stage: FlowStage): Promise<CompiledStageContract | null> {
  try {
    return await loadCompiledContract(repoRoot, stage);
  } catch {
    return null;
  }
}

async function loadCurrentSkillResolution(repoRoot: string, stage: FlowStage): Promise<StageSkillResolution | null> {
  try {
    return await resolveStageSkills(repoRoot, stage);
  } catch {
    return null;
  }
}

async function loadSelectedPlanUnit(repoRoot: string, stage: FlowStage): Promise<{ id: string; description: string; files: string[]; hotspots: string[] } | null> {
  if (stage === 'plan') {
    try {
      const planUnits = await readPlanUnits(repoRoot);
      return planUnits[0] ?? null;
    } catch {
      return null;
    }
  }

  if (stage === 'refactor' || stage === 'validate') {
    try {
      return await readSelectedRefactorStep(repoRoot);
    } catch {
      return null;
    }
  }

  return null;
}

function selectFilesOfInterest(options: {
  selectedPlanUnit: { id: string; description: string; files?: string[]; hotspots?: string[] } | null;
  hotspots: Array<{ path: string }>;
  currentArtifactSummary: { artifact_path: string } | null;
}): string[] {
  const planFiles = options.selectedPlanUnit?.files ?? [];
  const hotspotFiles = [
    ...(options.selectedPlanUnit?.hotspots ?? []),
    ...options.hotspots.map((entry) => entry.path)
  ];
  const artifactPath = options.currentArtifactSummary ? [options.currentArtifactSummary.artifact_path] : [];

  return [...new Set([...planFiles, ...hotspotFiles.slice(0, 3), ...artifactPath])]
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

function buildDeltaPayload(options: {
  state: ProdifyState;
  contract: CompiledStageContract | null;
  scoreSummary: {
    baseline_score: number | null;
    final_score: number | null;
    delta: ScoreDelta | null;
  };
}): Record<string, unknown> {
  const validation = options.state.runtime.last_validation;
  return {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    current_stage: currentStage(options.state),
    current_state: options.state.runtime.current_state,
    satisfied: validation?.passed
      ? ['last_validation_passed']
      : [],
    missing: validation?.passed
      ? []
      : [
        ...(validation?.missing_artifacts ?? []),
        ...((validation?.violated_rules ?? []).map((issue) => issue.rule))
      ].sort((left, right) => left.localeCompare(right)),
    changed_since_last_iteration: {
      runtime_state: options.state.runtime.current_state,
      next_action: options.state.runtime.next_action,
      score_delta: options.scoreSummary.delta?.delta ?? null,
      retry_count: options.state.runtime.enforcement_loop.retry_count
    },
    next_required_action: options.state.runtime.next_action,
    contract_expectations: options.contract?.success_criteria ?? [],
    unmet_requirements: options.state.runtime.enforcement_loop.unmet_requirement_rules
  };
}

function buildValidationDeltaPayload(state: ProdifyState): Record<string, unknown> {
  const validation = state.runtime.last_validation;
  return {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    stage: state.runtime.current_stage ?? state.runtime.pending_stage ?? null,
    status: validation?.passed ? 'pass' : validation ? 'fail' : 'unknown',
    failed_checks: state.runtime.enforcement_loop.last_validation_delta.failed_checks,
    threshold_gaps: state.runtime.enforcement_loop.last_validation_delta.threshold_gaps,
    missing_evidence: state.runtime.enforcement_loop.last_validation_delta.missing_evidence,
    hotspot_targets: state.runtime.enforcement_loop.last_validation_delta.hotspot_targets,
    unmet_requirements: validation?.unmet_requirements ?? validation?.violated_rules ?? [],
    missing_artifacts: validation?.missing_artifacts ?? [],
    warnings: validation?.warnings ?? [],
    diagnostics: validation?.diagnostics ?? []
  };
}

export async function syncRuntimeMetadata(repoRoot: string, state: ProdifyState): Promise<void> {
  const stage = currentStage(state);
  const [contractInventory, contract, stageSkillResolution, scoreSummary, selectedPlanUnit, artifactSummaries, baselineSnapshot, hotspotsAfter] = await Promise.all([
    inspectCompiledContracts(repoRoot),
    loadCurrentContract(repoRoot, stage),
    loadCurrentSkillResolution(repoRoot, stage),
    readScoreSummary(repoRoot),
    loadSelectedPlanUnit(repoRoot, stage),
    syncArtifactSummaries(repoRoot),
    readRefactorBaselineSnapshot(repoRoot),
    detectHotspots(repoRoot)
  ]);
  const hotspotsBefore = baselineSnapshot ? detectHotspotsFromSnapshot(baselineSnapshot) : hotspotsAfter;

  const currentStageIndex = ARTIFACT_ORDER.findIndex((entry) => entry.stage === stage);
  const predecessorSummaries = artifactSummaries.filter((summary) => {
    const summaryIndex = ARTIFACT_ORDER.findIndex((entry) => entry.stage === summary.stage);
    return summaryIndex !== -1 && summaryIndex < currentStageIndex;
  });
  const currentStageSummary = artifactSummaries.find((summary) => summary.stage === stage) ?? null;
  const filesOfInterest = selectFilesOfInterest({
    selectedPlanUnit,
    hotspots: hotspotsAfter,
    currentArtifactSummary: currentStageSummary
  });
  const hotspotImprovements = state.runtime.last_validation?.diff_result
    ? await evaluateHotspotImprovements(repoRoot, {
      before: hotspotsBefore,
      after: hotspotsAfter,
      touchedPaths: [
        ...state.runtime.last_validation.diff_result.modifiedPaths,
        ...state.runtime.last_validation.diff_result.addedPaths,
        ...state.runtime.last_validation.diff_result.deletedPaths
      ]
    })
    : [];
  const currentStagePack = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    current_stage: stage,
    current_task_id: state.runtime.current_task_id ?? contract?.task_id ?? null,
    compiled_contract_path: contract ? `.prodify/contracts/${stage}.contract.json` : null,
    predecessor_artifact_summaries: predecessorSummaries.map((summary) => ({
      stage: summary.stage,
      task_id: summary.task_id,
      artifact_path: summary.artifact_path,
      summary_path: summary.summary_path,
      headings: summary.headings,
      summary_lines: summary.summary_lines
    })),
    current_artifact_summary: currentStageSummary ? {
      artifact_path: currentStageSummary.artifact_path,
      summary_path: currentStageSummary.summary_path,
      headings: currentStageSummary.headings,
      summary_lines: currentStageSummary.summary_lines
    } : null,
    selected_plan_unit: selectedPlanUnit,
    active_skill_ids: stageSkillResolution?.active_skill_ids ?? [],
    validation_requirements: contract?.success_criteria ?? [],
    artifact_dependencies: contract?.required_artifacts.map((artifact) => artifact.path) ?? [],
    score_summary: scoreSummary,
    hotspots: hotspotsAfter,
    hotspot_improvements: hotspotImprovements,
    hotspot_metrics: state.runtime.last_validation?.refactor_impact_report?.hotspot_metrics ?? null,
    enforcement_loop: state.runtime.enforcement_loop
  };

  const bootstrapManifest = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    runtime_state_path: '.prodify/state.json',
    current_state: state.runtime.current_state,
    runtime_status: state.runtime.status,
    current_stage: stage,
    current_task_id: state.runtime.current_task_id ?? contract?.task_id ?? null,
    compiled_contract_path: contract ? `.prodify/contracts/${stage}.contract.json` : null,
    selected_plan_unit: selectedPlanUnit,
    artifact_dependencies: contract?.required_artifacts.map((artifact) => artifact.path) ?? [],
    active_skill_ids: stageSkillResolution?.active_skill_ids ?? [],
    scoring_snapshot_summary: scoreSummary,
    next_recommended_action: state.runtime.next_action,
    resumable: state.runtime.resumable,
    contract_freshness: contractInventory.ok ? 'synchronized' : 'repair-required',
    current_stage_context_path: '.prodify/runtime/current-stage.json',
    current_iteration_path: '.prodify/runtime/current-iteration.json',
    delta_path: '.prodify/runtime/delta.json',
    validation_delta_path: '.prodify/runtime/validation-delta.json',
    hotspots_path: '.prodify/runtime/hotspots.json',
    enforcement_loop_path: '.prodify/runtime/enforcement-loop.json',
    commands: {
      init: '$prodify-init',
      execute: '$prodify-execute',
      resume: '$prodify-resume'
    }
  };
  const currentIteration = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    current_stage: stage,
    selected_execution_unit: selectedPlanUnit,
    targeted_hotspots: selectedPlanUnit?.hotspots ?? [],
    files_of_interest: filesOfInterest,
    relevant_contract_slice: contract ? {
      task_id: contract.task_id,
      required_artifacts: contract.required_artifacts,
      allowed_write_roots: contract.allowed_write_roots,
      policy_rules: contract.policy_rules,
      success_criteria: contract.success_criteria,
      diff_validation_rules: contract.diff_validation_rules,
      min_impact_score: contract.min_impact_score
    } : null,
    active_skills: stageSkillResolution?.active_skill_ids ?? [],
    relevant_validation_checks: state.runtime.last_validation?.violated_rules ?? [],
    unmet_requirements: state.runtime.enforcement_loop.unmet_requirement_rules,
    retry_context: state.runtime.enforcement_loop,
    score_snapshot: scoreSummary,
    next_output_target: contract?.required_artifacts[0]?.path ?? null
  };
  const currentIterationSerialized = serializeJson(currentIteration);
  const iterationTelemetry = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    approx_bytes: currentIterationSerialized.length,
    approx_tokens: Math.ceil(currentIterationSerialized.length / 4)
  };
  const hotspotsSummary = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    hotspots: hotspotsAfter,
    improvements: hotspotImprovements,
    metrics: state.runtime.last_validation?.refactor_impact_report?.hotspot_metrics ?? null
  };
  const enforcementLoopSummary = {
    schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
    ...state.runtime.enforcement_loop
  };
  const deltaPayload = buildDeltaPayload({
    state,
    contract,
    scoreSummary
  });
  const validationDeltaPayload = buildValidationDeltaPayload(state);

  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/current-stage.json'),
    serializeJson(currentStagePack)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/bootstrap.json'),
    serializeJson(bootstrapManifest)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/current-iteration.json'),
    currentIterationSerialized
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/delta.json'),
    serializeJson(deltaPayload)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/validation-delta.json'),
    serializeJson(validationDeltaPayload)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/hotspots.json'),
    serializeJson(hotspotsSummary)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/enforcement-loop.json'),
    serializeJson(enforcementLoopSummary)
  );
  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/runtime/iteration-telemetry.json'),
    serializeJson(iterationTelemetry)
  );
}
