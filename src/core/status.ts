import fs from 'node:fs/promises';

import { loadDefaultPreset } from '../presets/loader.js';
import { inspectCompiledContracts } from '../contracts/freshness.js';
import { listConfiguredAgents, readGlobalAgentSetupState } from './agent-setup.js';
import { detectRuntimeAgentFromEnv } from './agent-runtime.js';
import { pathExists } from './fs.js';
import { getResumeDecision } from './flow-state.js';
import { resolveStageSkills } from './skill-resolution.js';
import { resolveCanonicalPath, resolveRepoPath, REQUIRED_CANONICAL_PATHS } from './paths.js';
import { readRuntimeState, RUNTIME_STATUS } from './state.js';
import { inspectVersionStatus } from './version-checks.js';
import { buildBootstrapPrompt, hasManualBootstrapGuidance } from './prompt-builder.js';
import { getRuntimeProfile } from './targets.js';
import { readScoreDelta } from '../scoring/model.js';
import type {
  RuntimeProfileName,
  ScoreDelta,
  RuntimeStateBlock,
  StatusReport,
  VersionInspection,
  VersionMetadata
} from '../types.js';

function describeCanonicalHealth(missingPaths: string[]): string {
  if (missingPaths.length === 0) {
    return 'healthy';
  }

  return `missing ${missingPaths.join(', ')}`;
}

function hasStageValidationFailure(report: StatusReport): boolean {
  return report.runtimeState?.runtime.current_state === 'failed'
    || report.runtimeState?.runtime.last_validation_result === 'fail';
}

function describeWorkspaceHealth(report: StatusReport): string {
  if (!report.initialized) {
    return 'not initialized';
  }

  const issues = [];
  if (!report.canonicalOk) {
    issues.push(`canonical files: ${describeCanonicalHealth(report.canonicalMissing)}`);
  }
  if (report.versionStatus.status !== 'current') {
    issues.push(`version/schema: ${report.versionStatus.status}`);
  }
  if (report.runtimeStateError) {
    issues.push('runtime state unreadable');
  }
  if (!report.manualBootstrapReady) {
    issues.push('bootstrap guidance incomplete');
  }

  return issues.length === 0 ? 'healthy' : `repair required (${issues.join('; ')})`;
}

function describeContractFreshness(report: StatusReport): string {
  if (!report.contractInventory) {
    return 'unavailable';
  }

  if (report.contractInventory.ok) {
    return `${report.contractInventory.compiledCount} compiled, synchronized`;
  }

  const parts = [];
  if (report.contractInventory.missingCompiledStages.length > 0) {
    parts.push(`missing compiled: ${report.contractInventory.missingCompiledStages.join(', ')}`);
  }
  if (report.contractInventory.staleStages.length > 0) {
    parts.push(`stale: ${report.contractInventory.staleStages.join(', ')}`);
  }
  if (report.contractInventory.invalidStages.length > 0) {
    parts.push(`invalid: ${report.contractInventory.invalidStages.join(', ')}`);
  }

  return parts.join('; ') || 'invalid';
}

function describeGlobalAgentSetup(report: StatusReport): string {
  return report.configuredAgents.length === 0 ? 'none configured' : report.configuredAgents.join(', ');
}

function describeSkillStage(report: StatusReport): string {
  return report.stageSkillResolution?.stage ?? 'unavailable';
}

function describeConsideredSkills(report: StatusReport): string {
  if (!report.stageSkillResolution) {
    return 'unavailable';
  }

  if (report.stageSkillResolution.considered_skills.length === 0) {
    return 'none';
  }

  return report.stageSkillResolution.considered_skills
    .map((skill) => `${skill.id} [${skill.reason}]`)
    .join(', ');
}

function describeActiveSkills(report: StatusReport): string {
  if (!report.stageSkillResolution) {
    return 'unavailable';
  }

  const activeSkills = report.stageSkillResolution.considered_skills.filter((skill) => skill.active);
  if (activeSkills.length === 0) {
    return 'none';
  }

  return activeSkills.map((skill) => `${skill.id} [${skill.reason}]`).join(', ');
}

function describeVersion(versionStatus: VersionInspection, presetMetadata: VersionMetadata): string {
  if (versionStatus.status === 'current') {
    return `current (${presetMetadata.name}@${presetMetadata.version}, schema ${presetMetadata.schemaVersion})`;
  }

  if (versionStatus.status === 'outdated' && versionStatus.current) {
    return `outdated (${versionStatus.current.presetName}@${versionStatus.current.presetVersion}, schema ${versionStatus.current.schemaVersion})`;
  }

  if (versionStatus.status === 'malformed') {
    return 'malformed';
  }

  return 'missing';
}

function describeRuntime(runtime: RuntimeStateBlock | null): string {
  if (!runtime) {
    return 'unavailable';
  }

  if (runtime.status === RUNTIME_STATUS.NOT_BOOTSTRAPPED) {
    return 'not bootstrapped';
  }

  const stage = runtime.current_stage ?? runtime.pending_stage ?? 'none';
  const task = runtime.current_task_id ?? (runtime.pending_stage ? `${runtime.pending_stage} pending` : 'none');
  return `${runtime.current_state} at ${stage} (${task})`;
}

function describeStageValidation(report: StatusReport): string {
  const runtime = report.runtimeState?.runtime ?? null;
  if (!runtime) {
    return 'unavailable';
  }

  if (runtime.current_state === 'failed' || runtime.last_validation_result === 'fail') {
    const stage = runtime.failure_metadata?.stage ?? runtime.current_stage ?? null;
    const reason = runtime.failure_metadata?.reason ?? runtime.blocked_reason ?? 'stage outputs failed contract validation';
    return `failed${stage ? ` at ${stage}` : ''}: ${reason}`;
  }

  if (!runtime.last_validation) {
    return 'not run yet';
  }

  return runtime.last_validation.passed
    ? `last pass at ${runtime.last_validation.stage} (contract ${runtime.last_validation.contract_version})`
    : `failed at ${runtime.last_validation.stage}`;
}

function describeImpactScore(scoreDelta: ScoreDelta | null): string {
  if (!scoreDelta) {
    return 'not available';
  }

  const threshold = scoreDelta.min_impact_score !== undefined ? `, threshold=${scoreDelta.min_impact_score}` : '';
  const verdict = scoreDelta.passed === undefined ? '' : `, passed=${scoreDelta.passed}`;
  return `${scoreDelta.baseline_score} -> ${scoreDelta.final_score} (delta ${scoreDelta.delta}${threshold}${verdict})`;
}

async function checkManualBootstrapGuidance(repoRoot: string): Promise<boolean> {
  const agentsPath = resolveCanonicalPath(repoRoot, '.prodify/AGENTS.md');
  if (!(await pathExists(agentsPath))) {
    return false;
  }

  const content = await fs.readFile(agentsPath, 'utf8');
  return hasManualBootstrapGuidance(content);
}

function deriveNextAction({
  initialized,
  canonicalOk,
  contractsOk,
  configuredAgents,
  versionStatus,
  runtimeState,
  runtimeStateError,
  bootstrapPrompt
}: {
  initialized: boolean;
  canonicalOk: boolean;
  contractsOk: boolean;
  configuredAgents: RuntimeProfileName[];
  versionStatus: VersionInspection;
  runtimeState: StatusReport['runtimeState'];
  runtimeStateError: Error | null;
  bootstrapPrompt: string;
}): string {
  if (!initialized) {
    return 'prodify init';
  }

  if (!canonicalOk || !contractsOk || ['missing', 'malformed', 'outdated'].includes(versionStatus.status)) {
    return 'prodify update';
  }

  if (runtimeStateError) {
    return 'prodify update';
  }

  if (!runtimeState || runtimeState.runtime.status === RUNTIME_STATUS.NOT_BOOTSTRAPPED) {
    if (configuredAgents.length === 0) {
      return 'prodify setup-agent <agent>';
    }

    return `tell your agent: "${bootstrapPrompt}"`;
  }

  if (runtimeState.runtime.current_state === 'failed' || runtimeState.runtime.last_validation_result === 'fail') {
    return 'rerun or remediate stage outputs';
  }

  const resume = getResumeDecision(runtimeState);
  if (!resume.resumable) {
    return runtimeState.runtime.status === RUNTIME_STATUS.COMPLETE ? 'none' : 'repair runtime state';
  }

  return resume.command ?? 'repair runtime state';
}

export async function inspectRepositoryStatus(
  repoRoot: string,
  options: { agent?: string | null } = {}
): Promise<StatusReport> {
  const preset = await loadDefaultPreset();
  const prodifyPath = resolveRepoPath(repoRoot, '.prodify');
  const initialized = await pathExists(prodifyPath);
  const configuredAgents = listConfiguredAgents(await readGlobalAgentSetupState({
    allowMissing: true
  }));
  const bootstrapProfile = (
    getRuntimeProfile(options.agent ?? null)?.name
    ?? detectRuntimeAgentFromEnv()
    ?? (configuredAgents.length === 1 ? configuredAgents[0] : 'codex')
  ) as RuntimeProfileName;
  const bootstrapPrompt = buildBootstrapPrompt(bootstrapProfile);

  if (!initialized) {
    return {
      ok: false,
      initialized: false,
      canonicalOk: false,
      canonicalMissing: [...REQUIRED_CANONICAL_PATHS],
      contractsOk: false,
      contractInventory: null,
      versionStatus: {
        status: 'missing',
        current: null,
        expected: preset.metadata,
        schemaMigrationRequired: false
      },
      configuredAgents,
      runtimeState: null,
      runtimeStateError: null,
      resumable: false,
      manualBootstrapReady: false,
      bootstrapProfile,
      bootstrapPrompt,
      stageSkillResolution: null,
      scoreDelta: null,
      recommendedNextAction: 'prodify init',
      presetMetadata: preset.metadata
    };
  }

  const missingPaths = [];
  for (const relativePath of REQUIRED_CANONICAL_PATHS) {
    if (!(await pathExists(resolveCanonicalPath(repoRoot, relativePath)))) {
      missingPaths.push(relativePath);
    }
  }

  const contractInventory = await inspectCompiledContracts(repoRoot);
  const versionStatus = await inspectVersionStatus(repoRoot, preset.metadata);
  let runtimeState = null;
  let runtimeStateError = null;
  let stageSkillResolution = null;
  let scoreDelta = null;

  try {
    runtimeState = await readRuntimeState(repoRoot, {
      presetMetadata: preset.metadata
    });
  } catch (error) {
    runtimeStateError = error instanceof Error ? error : new Error(String(error));
  }

  const manualBootstrapReady = await checkManualBootstrapGuidance(repoRoot);
  scoreDelta = await readScoreDelta(repoRoot);
  const canonicalOk = missingPaths.length === 0;
  if (canonicalOk && contractInventory.ok) {
    const skillStage = runtimeState?.runtime.current_stage
      ?? runtimeState?.runtime.pending_stage
      ?? 'understand';
    stageSkillResolution = await resolveStageSkills(repoRoot, skillStage);
  }
  const resume = runtimeState ? getResumeDecision(runtimeState) : {
    resumable: false,
    command: null,
    reason: runtimeStateError?.message ?? 'runtime unavailable'
  };
  const stageValidationFailed = runtimeState?.runtime.current_state === 'failed'
    || runtimeState?.runtime.last_validation_result === 'fail';

  return {
    ok: initialized
      && canonicalOk
      && contractInventory.ok
      && versionStatus.status === 'current'
      && !runtimeStateError
      && manualBootstrapReady
      && !stageValidationFailed,
    initialized,
    canonicalOk,
    canonicalMissing: missingPaths,
    contractsOk: contractInventory.ok,
    contractInventory,
    versionStatus,
    configuredAgents,
    runtimeState,
    runtimeStateError,
    resumable: resume.resumable,
    manualBootstrapReady,
    bootstrapProfile,
    bootstrapPrompt,
    stageSkillResolution,
    scoreDelta,
    recommendedNextAction: deriveNextAction({
      initialized,
      canonicalOk,
      contractsOk: contractInventory.ok,
      configuredAgents,
      versionStatus,
      runtimeState,
      runtimeStateError,
      bootstrapPrompt
    }),
    presetMetadata: preset.metadata
  };
}

export function renderStatusReport(report: StatusReport): string {
  const lines = [
    'Prodify Status',
    `Repository: ${report.initialized ? 'initialized' : 'not initialized'}`,
    `Workspace health: ${describeWorkspaceHealth(report)}`,
    `Canonical files: ${describeCanonicalHealth(report.canonicalMissing)}`,
    `Contract freshness: ${describeContractFreshness(report)}`,
    `Version/schema: ${describeVersion(report.versionStatus, report.presetMetadata)}`,
    'Repo runtime binding: agent-agnostic',
    `Global agent setup: ${describeGlobalAgentSetup(report)}`,
    `Skill routing stage: ${describeSkillStage(report)}`,
    `Skills considered: ${describeConsideredSkills(report)}`,
    `Skills active: ${describeActiveSkills(report)}`,
    `Execution state: ${describeRuntime(report.runtimeState?.runtime ?? null)}`,
    `Stage validation: ${describeStageValidation(report)}`,
    `Impact score: ${describeImpactScore(report.scoreDelta)}`,
    `Manual bootstrap: ${report.manualBootstrapReady ? 'ready' : 'repair .prodify/AGENTS.md guidance'}`,
    `Bootstrap profile: ${report.bootstrapProfile}`,
    `Bootstrap prompt: ${report.bootstrapPrompt}`,
    `Resumable: ${report.resumable ? 'yes' : 'no'}`,
    `Recommended next action: ${report.recommendedNextAction}`
  ];

  if (report.runtimeStateError) {
    lines.splice(7, 0, `Runtime state: ${report.runtimeStateError.message}`);
  }

  return lines.join('\n');
}
