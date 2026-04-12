import fs from 'node:fs/promises';
import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { resolveCanonicalPath } from './paths.js';
import { writeRefactorBaselineSnapshot } from './diff-validator.js';
import { syncRuntimeMetadata } from './runtime-metadata.js';
import { syncScoreArtifactsForRuntimeState } from '../scoring/model.js';
export const RUNTIME_STATE_SCHEMA_VERSION = '3';
export const RUNTIME_STATUS = {
    NOT_BOOTSTRAPPED: 'not_bootstrapped',
    READY: 'ready',
    RUNNING: 'running',
    AWAITING_VALIDATION: 'awaiting_validation',
    BLOCKED: 'blocked',
    FAILED: 'failed',
    COMPLETE: 'complete'
};
function isExecutionMode(value) {
    return value === 'interactive' || value === 'auto';
}
function isFlowStage(value) {
    return value === 'understand'
        || value === 'diagnose'
        || value === 'architecture'
        || value === 'plan'
        || value === 'refactor'
        || value === 'validate';
}
function isRuntimeStatus(value) {
    return value === 'not_bootstrapped'
        || value === 'ready'
        || value === 'running'
        || value === 'awaiting_validation'
        || value === 'blocked'
        || value === 'failed'
        || value === 'complete';
}
function isValidationResult(value) {
    return value === 'unknown' || value === 'pass' || value === 'fail' || value === 'inconclusive';
}
function isRuntimeContractState(value) {
    return typeof value === 'string' && [
        'not_bootstrapped',
        'bootstrapped',
        'understand_pending',
        'understand_complete',
        'diagnose_pending',
        'diagnose_complete',
        'architecture_pending',
        'architecture_complete',
        'plan_pending',
        'plan_complete',
        'refactor_pending',
        'refactor_complete',
        'validate_pending',
        'validate_complete',
        'blocked',
        'failed',
        'completed'
    ].includes(value);
}
function normalizeStageList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isFlowStage);
}
function asRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
function normalizeBootstrapMetadata(value) {
    const record = asRecord(value);
    return {
        bootstrapped: Boolean(record.bootstrapped)
    };
}
function createEmptyEnforcementLoop() {
    return {
        stage: null,
        selected_plan_unit: null,
        retry_count: 0,
        retry_limit: 0,
        can_retry: false,
        unmet_requirements: [],
        unmet_requirement_rules: [],
        last_diff_result: null,
        last_score_delta: null,
        last_validation_delta: {
            failed_checks: [],
            threshold_gaps: [],
            missing_evidence: [],
            hotspot_targets: []
        },
        last_refactor_impact_report: null,
        hard_stop_reason: null
    };
}
function normalizeFailureMetadata(value) {
    if (!value) {
        return null;
    }
    const record = asRecord(value);
    return {
        stage: isFlowStage(record.stage) ? record.stage : null,
        contract_version: typeof record.contract_version === 'string' ? record.contract_version : null,
        reason: typeof record.reason === 'string' ? record.reason : 'unknown failure'
    };
}
function normalizeValidation(value) {
    if (!value) {
        return null;
    }
    const record = asRecord(value);
    return {
        stage: isFlowStage(record.stage) ? record.stage : 'understand',
        contract_version: typeof record.contract_version === 'string' ? record.contract_version : 'unknown',
        passed: Boolean(record.passed),
        violated_rules: Array.isArray(record.violated_rules)
            ? record.violated_rules
                .map((entry) => asRecord(entry))
                .map((entry) => ({
                rule: typeof entry.rule === 'string' ? entry.rule : 'unknown',
                message: typeof entry.message === 'string' ? entry.message : 'validation issue',
                path: typeof entry.path === 'string' ? entry.path : undefined
            }))
            : [],
        missing_artifacts: Array.isArray(record.missing_artifacts)
            ? record.missing_artifacts.filter((entry) => typeof entry === 'string')
            : [],
        warnings: Array.isArray(record.warnings)
            ? record.warnings.filter((entry) => typeof entry === 'string')
            : [],
        diagnostics: Array.isArray(record.diagnostics)
            ? record.diagnostics.filter((entry) => typeof entry === 'string')
            : [],
        ...(typeof record.impact_score_delta === 'number' ? { impact_score_delta: record.impact_score_delta } : {}),
        ...(typeof record.score_delta === 'object' && record.score_delta !== null ? { score_delta: record.score_delta } : {}),
        ...(Array.isArray(record.unmet_requirements)
            ? {
                unmet_requirements: record.unmet_requirements
                    .map((entry) => asRecord(entry))
                    .map((entry) => ({
                    rule: typeof entry.rule === 'string' ? entry.rule : 'unknown',
                    message: typeof entry.message === 'string' ? entry.message : 'validation issue',
                    path: typeof entry.path === 'string' ? entry.path : undefined
                }))
            }
            : {}),
        ...(record.enforcement_action === 'pass' || record.enforcement_action === 'retry' || record.enforcement_action === 'fail'
            ? { enforcement_action: record.enforcement_action }
            : {}),
        ...(typeof record.diff_result === 'object' && record.diff_result !== null ? { diff_result: record.diff_result } : {}),
        ...(typeof record.refactor_impact_report === 'object' && record.refactor_impact_report !== null
            ? { refactor_impact_report: record.refactor_impact_report }
            : {})
    };
}
function normalizeEnforcementLoop(value) {
    const record = asRecord(value);
    const base = createEmptyEnforcementLoop();
    return {
        ...base,
        stage: isFlowStage(record.stage) ? record.stage : null,
        selected_plan_unit: typeof record.selected_plan_unit === 'string' ? record.selected_plan_unit : null,
        retry_count: typeof record.retry_count === 'number' && record.retry_count >= 0 ? record.retry_count : 0,
        retry_limit: typeof record.retry_limit === 'number' && record.retry_limit >= 0 ? record.retry_limit : 0,
        can_retry: Boolean(record.can_retry),
        unmet_requirements: Array.isArray(record.unmet_requirements)
            ? record.unmet_requirements
                .map((entry) => asRecord(entry))
                .map((entry) => ({
                rule: typeof entry.rule === 'string' ? entry.rule : 'unknown',
                message: typeof entry.message === 'string' ? entry.message : 'validation issue',
                path: typeof entry.path === 'string' ? entry.path : undefined
            }))
            : [],
        unmet_requirement_rules: Array.isArray(record.unmet_requirement_rules)
            ? record.unmet_requirement_rules.filter((entry) => typeof entry === 'string')
            : [],
        last_diff_result: typeof record.last_diff_result === 'object' && record.last_diff_result !== null
            ? record.last_diff_result
            : null,
        last_score_delta: typeof record.last_score_delta === 'object' && record.last_score_delta !== null
            ? record.last_score_delta
            : null,
        last_validation_delta: typeof record.last_validation_delta === 'object' && record.last_validation_delta !== null
            ? {
                failed_checks: Array.isArray(asRecord(record.last_validation_delta).failed_checks)
                    ? asRecord(record.last_validation_delta).failed_checks.filter((entry) => typeof entry === 'string')
                    : [],
                threshold_gaps: Array.isArray(asRecord(record.last_validation_delta).threshold_gaps)
                    ? asRecord(record.last_validation_delta).threshold_gaps.filter((entry) => typeof entry === 'string')
                    : [],
                missing_evidence: Array.isArray(asRecord(record.last_validation_delta).missing_evidence)
                    ? asRecord(record.last_validation_delta).missing_evidence.filter((entry) => typeof entry === 'string')
                    : [],
                hotspot_targets: Array.isArray(asRecord(record.last_validation_delta).hotspot_targets)
                    ? asRecord(record.last_validation_delta).hotspot_targets.filter((entry) => typeof entry === 'string')
                    : []
            }
            : base.last_validation_delta,
        last_refactor_impact_report: typeof record.last_refactor_impact_report === 'object' && record.last_refactor_impact_report !== null
            ? record.last_refactor_impact_report
            : null,
        hard_stop_reason: typeof record.hard_stop_reason === 'string' ? record.hard_stop_reason : null
    };
}
function normalizeValidatedContractVersions(value) {
    const record = asRecord(value);
    const normalized = {};
    for (const [key, rawValue] of Object.entries(record)) {
        if (isFlowStage(key) && typeof rawValue === 'string') {
            normalized[key] = rawValue;
        }
    }
    return normalized;
}
export function createInitialRuntimeState({ presetMetadata }) {
    return {
        schema_version: RUNTIME_STATE_SCHEMA_VERSION,
        preset_name: presetMetadata.name,
        preset_version: presetMetadata.version,
        runtime: {
            status: RUNTIME_STATUS.NOT_BOOTSTRAPPED,
            current_state: 'not_bootstrapped',
            mode: null,
            current_stage: null,
            current_task_id: null,
            pending_stage: null,
            completed_stages: [],
            awaiting_user_validation: false,
            last_validation_result: 'unknown',
            last_validation: null,
            last_validated_contract_versions: {},
            resumable: false,
            blocked_reason: null,
            failure_metadata: null,
            enforcement_loop: createEmptyEnforcementLoop(),
            bootstrap: {
                bootstrapped: false
            },
            next_action: '$prodify-init',
            timestamps: {
                bootstrapped_at: null,
                last_transition_at: null,
                completed_at: null
            }
        }
    };
}
function normalizeRuntimeBlock(runtime) {
    const record = asRecord(runtime);
    const timestamps = asRecord(record.timestamps);
    return {
        status: isRuntimeStatus(record.status) ? record.status : RUNTIME_STATUS.NOT_BOOTSTRAPPED,
        current_state: isRuntimeContractState(record.current_state) ? record.current_state : 'not_bootstrapped',
        mode: isExecutionMode(record.mode) ? record.mode : null,
        current_stage: isFlowStage(record.current_stage) ? record.current_stage : null,
        current_task_id: typeof record.current_task_id === 'string' ? record.current_task_id : null,
        pending_stage: isFlowStage(record.pending_stage) ? record.pending_stage : null,
        completed_stages: normalizeStageList(record.completed_stages),
        awaiting_user_validation: Boolean(record.awaiting_user_validation),
        last_validation_result: isValidationResult(record.last_validation_result) ? record.last_validation_result : 'unknown',
        last_validation: normalizeValidation(record.last_validation),
        last_validated_contract_versions: normalizeValidatedContractVersions(record.last_validated_contract_versions),
        resumable: Boolean(record.resumable),
        blocked_reason: typeof record.blocked_reason === 'string' ? record.blocked_reason : null,
        failure_metadata: normalizeFailureMetadata(record.failure_metadata),
        enforcement_loop: normalizeEnforcementLoop(record.enforcement_loop),
        bootstrap: normalizeBootstrapMetadata(record.bootstrap),
        next_action: typeof record.next_action === 'string' ? record.next_action : '$prodify-init',
        timestamps: {
            bootstrapped_at: typeof timestamps.bootstrapped_at === 'string' ? timestamps.bootstrapped_at : null,
            last_transition_at: typeof timestamps.last_transition_at === 'string' ? timestamps.last_transition_at : null,
            completed_at: typeof timestamps.completed_at === 'string' ? timestamps.completed_at : null
        }
    };
}
export function normalizeRuntimeState(raw, { presetMetadata }) {
    const record = asRecord(raw);
    const base = createInitialRuntimeState({ presetMetadata });
    return {
        ...base,
        schema_version: base.schema_version,
        preset_name: presetMetadata.name,
        preset_version: presetMetadata.version,
        runtime: normalizeRuntimeBlock(record.runtime)
    };
}
export function serializeRuntimeState(state) {
    return `${JSON.stringify(state, null, 2)}\n`;
}
export async function readRuntimeState(repoRoot, { allowMissing = false, presetMetadata }) {
    const statePath = resolveCanonicalPath(repoRoot, '.prodify/state.json');
    if (!(await pathExists(statePath))) {
        if (allowMissing) {
            return null;
        }
        throw new ProdifyError('Runtime state is missing: .prodify/state.json', {
            code: 'RUNTIME_STATE_MISSING'
        });
    }
    try {
        const raw = JSON.parse(await fs.readFile(statePath, 'utf8'));
        return normalizeRuntimeState(raw, { presetMetadata });
    }
    catch {
        throw new ProdifyError('Runtime state is malformed: .prodify/state.json', {
            code: 'RUNTIME_STATE_MALFORMED'
        });
    }
}
export async function writeRuntimeState(repoRoot, state) {
    const statePath = resolveCanonicalPath(repoRoot, '.prodify/state.json');
    await writeFileEnsuringDir(statePath, serializeRuntimeState(state));
    if (state.runtime.current_state === 'refactor_pending') {
        await writeRefactorBaselineSnapshot(repoRoot);
    }
    await syncScoreArtifactsForRuntimeState(repoRoot, state);
    await syncRuntimeMetadata(repoRoot, state);
}
