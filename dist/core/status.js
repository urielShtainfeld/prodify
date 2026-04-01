import fs from 'node:fs/promises';
import { loadDefaultPreset } from '../presets/loader.js';
import { inspectCompiledContracts } from '../contracts/compiler.js';
import { pathExists } from './fs.js';
import { getResumeDecision } from './flow-state.js';
import { resolveCanonicalPath, resolveRepoPath, REQUIRED_CANONICAL_PATHS } from './paths.js';
import { readRuntimeState, RUNTIME_STATUS } from './state.js';
import { inspectVersionStatus } from './version-checks.js';
import { buildBootstrapPrompt, hasManualBootstrapGuidance } from './prompt-builder.js';
import { getRuntimeProfile } from './targets.js';
function describeCanonicalHealth(missingPaths) {
    if (missingPaths.length === 0) {
        return 'healthy';
    }
    return `missing ${missingPaths.join(', ')}`;
}
function describeContracts(report) {
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
    const stage = runtime.current_stage ?? runtime.pending_stage ?? 'none';
    const task = runtime.current_task_id ?? (runtime.pending_stage ? `${runtime.pending_stage} pending` : 'none');
    return `${runtime.current_state} at ${stage} (${task})`;
}
async function checkManualBootstrapGuidance(repoRoot) {
    const agentsPath = resolveCanonicalPath(repoRoot, '.prodify/AGENTS.md');
    if (!(await pathExists(agentsPath))) {
        return false;
    }
    const content = await fs.readFile(agentsPath, 'utf8');
    return hasManualBootstrapGuidance(content);
}
function deriveNextAction({ initialized, canonicalOk, contractsOk, versionStatus, runtimeState, runtimeStateError, bootstrapPrompt }) {
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
        return `tell your agent: "${bootstrapPrompt}"`;
    }
    const resume = getResumeDecision(runtimeState);
    if (!resume.resumable) {
        return runtimeState.runtime.status === RUNTIME_STATUS.COMPLETE ? 'none' : 'repair runtime state';
    }
    return resume.command ?? 'repair runtime state';
}
export async function inspectRepositoryStatus(repoRoot, options = {}) {
    const preset = await loadDefaultPreset();
    const prodifyPath = resolveRepoPath(repoRoot, '.prodify');
    const initialized = await pathExists(prodifyPath);
    const bootstrapProfile = (getRuntimeProfile(options.agent ?? null)?.name ?? 'codex');
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
    const contractInventory = await inspectCompiledContracts(repoRoot);
    const versionStatus = await inspectVersionStatus(repoRoot, preset.metadata);
    let runtimeState = null;
    let runtimeStateError = null;
    try {
        runtimeState = await readRuntimeState(repoRoot, {
            presetMetadata: preset.metadata
        });
    }
    catch (error) {
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
        ok: initialized
            && canonicalOk
            && contractInventory.ok
            && versionStatus.status === 'current'
            && !runtimeStateError
            && manualBootstrapReady,
        initialized,
        canonicalOk,
        canonicalMissing: missingPaths,
        contractsOk: contractInventory.ok,
        contractInventory,
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
            contractsOk: contractInventory.ok,
            versionStatus,
            runtimeState,
            runtimeStateError,
            bootstrapPrompt
        }),
        presetMetadata: preset.metadata
    };
}
export function renderStatusReport(report) {
    const lines = [
        'Prodify Status',
        `Repository: ${report.initialized ? 'initialized' : 'not initialized'}`,
        `Canonical files: ${describeCanonicalHealth(report.canonicalMissing)}`,
        `Contracts: ${describeContracts(report)}`,
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
        lines.splice(6, 0, `Runtime state: ${report.runtimeStateError.message}`);
    }
    return lines.join('\n');
}
