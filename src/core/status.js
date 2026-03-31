import { loadDefaultPreset } from '../presets/loader.js';
import { pathExists } from './fs.js';
import { getResumeDecision } from './flow-state.js';
import { resolveCanonicalPath, resolveRepoPath, REQUIRED_CANONICAL_PATHS } from './paths.js';
import { readRuntimeState, RUNTIME_STATUS } from './state.js';
import { inspectVersionStatus } from './version-checks.js';

function describeCanonicalHealth(missingPaths) {
  if (missingPaths.length === 0) {
    return 'healthy';
  }

  return `missing ${missingPaths.join(', ')}`;
}

function describeVersion(versionStatus, presetMetadata) {
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

function describeRuntime(runtime) {
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

function deriveNextAction({ initialized, canonicalOk, versionStatus, runtimeState, runtimeStateError }) {
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
    return 'open your agent and run $prodify-init';
  }

  const resume = getResumeDecision(runtimeState);
  if (!resume.resumable) {
    return runtimeState.runtime.status === RUNTIME_STATUS.COMPLETE ? 'none' : 'repair runtime state';
  }

  return resume.command;
}

export async function inspectRepositoryStatus(repoRoot) {
  const preset = await loadDefaultPreset();
  const prodifyPath = resolveRepoPath(repoRoot, '.prodify');
  const initialized = await pathExists(prodifyPath);

  if (!initialized) {
    return {
      ok: false,
      initialized: false,
      canonicalOk: false,
      canonicalMissing: [...REQUIRED_CANONICAL_PATHS],
      versionStatus: {
        status: 'missing',
        current: null
      },
      primaryAgent: null,
      runtimeState: null,
      resumable: false,
      recommendedNextAction: 'prodify init'
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
    runtimeStateError = error;
  }

  const resume = runtimeState ? getResumeDecision(runtimeState) : {
    resumable: false,
    command: null,
    reason: runtimeStateError?.message ?? 'runtime unavailable'
  };
  const canonicalOk = missingPaths.length === 0;

  return {
    ok: initialized && canonicalOk && versionStatus.status === 'current' && !runtimeStateError,
    initialized,
    canonicalOk,
    canonicalMissing: missingPaths,
    versionStatus,
    primaryAgent: runtimeState?.primary_agent ?? null,
    runtimeState,
    runtimeStateError,
    resumable: resume.resumable,
    recommendedNextAction: deriveNextAction({
      initialized,
      canonicalOk,
      versionStatus,
      runtimeState,
      runtimeStateError
    }),
    presetMetadata: preset.metadata
  };
}

export function renderStatusReport(report) {
  const lines = [
    'Prodify Status',
    `Repository: ${report.initialized ? 'initialized' : 'not initialized'}`,
    `Canonical files: ${describeCanonicalHealth(report.canonicalMissing)}`,
    `Version/schema: ${describeVersion(report.versionStatus, report.presetMetadata ?? { name: 'default', version: 'unknown', schemaVersion: 'unknown' })}`,
    `Primary agent runtime: ${report.primaryAgent ?? 'none'}`,
    `Execution state: ${describeRuntime(report.runtimeState?.runtime ?? null)}`,
    `Resumable: ${report.resumable ? 'yes' : 'no'}`,
    `Recommended next action: ${report.recommendedNextAction}`
  ];

  if (report.runtimeStateError) {
    lines.splice(5, 0, `Runtime state: ${report.runtimeStateError.message}`);
  }

  return lines.join('\n');
}
