import fs from 'node:fs/promises';

import { loadDefaultPreset } from '../presets/loader.js';
import { pathExists } from './fs.js';
import { getResumeDecision } from './flow-state.js';
import { resolveCanonicalPath, resolveRepoPath, REQUIRED_CANONICAL_PATHS } from './paths.js';
import { readRuntimeState, RUNTIME_STATUS } from './state.js';
import { inspectVersionStatus } from './version-checks.js';
import { buildBootstrapPrompt, hasManualBootstrapGuidance } from './prompt-builder.js';
import { getRuntimeProfile } from './targets.js';
import type {
  RuntimeProfileName,
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

  const stage = runtime.current_stage ?? 'none';
  const task = runtime.current_task_id ?? 'none';
  return `${runtime.status} at ${stage} (${task})`;
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
  versionStatus,
  runtimeState,
  runtimeStateError,
  bootstrapPrompt
}: {
  initialized: boolean;
  canonicalOk: boolean;
  versionStatus: VersionInspection;
  runtimeState: StatusReport['runtimeState'];
  runtimeStateError: Error | null;
  bootstrapPrompt: string;
}): string {
  if (!initialized) {
    return 'prodify init';
  }

  if (!canonicalOk || ['missing', 'malformed', 'outdated'].includes(versionStatus.status)) {
    return 'prodify update';
  }

  if (runtimeStateError) {
    return 'prodify update';
  }

  if (!runtimeState || runtimeState.runtime.status === RUNTIME_STATUS.NOT_BOOTSTRAPPED) {
    return `tell your agent: "${bootstrapPrompt}"`;
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
  const bootstrapProfile = (getRuntimeProfile(options.agent ?? null)?.name ?? 'codex') as RuntimeProfileName;
  const bootstrapPrompt = buildBootstrapPrompt(bootstrapProfile);

  if (!initialized) {
    return {
      ok: false,
      initialized: false,
      canonicalOk: false,
      canonicalMissing: [...REQUIRED_CANONICAL_PATHS],
      versionStatus: {
        status: 'missing',
        current: null,
        expected: preset.metadata,
        schemaMigrationRequired: false
      },
      primaryAgent: null,
      runtimeState: null,
      runtimeStateError: null,
      resumable: false,
      manualBootstrapReady: false,
      bootstrapProfile,
      bootstrapPrompt,
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

  const versionStatus = await inspectVersionStatus(repoRoot, preset.metadata);
  let runtimeState = null;
  let runtimeStateError = null;

  try {
    runtimeState = await readRuntimeState(repoRoot, {
      presetMetadata: preset.metadata
    });
  } catch (error) {
    runtimeStateError = error instanceof Error ? error : new Error(String(error));
  }

  const manualBootstrapReady = await checkManualBootstrapGuidance(repoRoot);
  const resume = runtimeState ? getResumeDecision(runtimeState) : {
    resumable: false,
    command: null,
    reason: runtimeStateError?.message ?? 'runtime unavailable'
  };
  const canonicalOk = missingPaths.length === 0;

  return {
    ok: initialized && canonicalOk && versionStatus.status === 'current' && !runtimeStateError && manualBootstrapReady,
    initialized,
    canonicalOk,
    canonicalMissing: missingPaths,
    versionStatus,
    primaryAgent: runtimeState?.primary_agent ?? null,
    runtimeState,
    runtimeStateError,
    resumable: resume.resumable,
    manualBootstrapReady,
    bootstrapProfile,
    bootstrapPrompt,
    recommendedNextAction: deriveNextAction({
      initialized,
      canonicalOk,
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
    `Canonical files: ${describeCanonicalHealth(report.canonicalMissing)}`,
    `Version/schema: ${describeVersion(report.versionStatus, report.presetMetadata)}`,
    `Primary agent runtime: ${report.primaryAgent ?? 'none'}`,
    `Execution state: ${describeRuntime(report.runtimeState?.runtime ?? null)}`,
    `Manual bootstrap: ${report.manualBootstrapReady ? 'ready' : 'repair .prodify/AGENTS.md guidance'}`,
    `Bootstrap profile: ${report.bootstrapProfile}`,
    `Bootstrap prompt: ${report.bootstrapPrompt}`,
    `Resumable: ${report.resumable ? 'yes' : 'no'}`,
    `Recommended next action: ${report.recommendedNextAction}`
  ];

  if (report.runtimeStateError) {
    lines.splice(5, 0, `Runtime state: ${report.runtimeStateError.message}`);
  }

  return lines.join('\n');
}
