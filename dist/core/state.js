import fs from 'node:fs/promises';
import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { isRuntimeProfileName, resolveCanonicalPath } from './paths.js';
export const RUNTIME_STATE_SCHEMA_VERSION = '1';
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
function normalizeStageList(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(isFlowStage);
}
function asRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
export function createInitialRuntimeState({ presetMetadata }) {
    return {
        schema_version: RUNTIME_STATE_SCHEMA_VERSION,
        preset_name: presetMetadata.name,
        preset_version: presetMetadata.version,
        primary_agent: null,
        runtime: {
            status: RUNTIME_STATUS.NOT_BOOTSTRAPPED,
            mode: null,
            selected_agent: null,
            current_stage: null,
            current_task_id: null,
            completed_stages: [],
            awaiting_user_validation: false,
            last_validation_result: 'unknown',
            resumable: false,
            blocked_reason: null,
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
        mode: isExecutionMode(record.mode) ? record.mode : null,
        selected_agent: isRuntimeProfileName(record.selected_agent) ? record.selected_agent : null,
        current_stage: isFlowStage(record.current_stage) ? record.current_stage : null,
        current_task_id: typeof record.current_task_id === 'string' ? record.current_task_id : null,
        completed_stages: normalizeStageList(record.completed_stages),
        awaiting_user_validation: Boolean(record.awaiting_user_validation),
        last_validation_result: isValidationResult(record.last_validation_result) ? record.last_validation_result : 'unknown',
        resumable: Boolean(record.resumable),
        blocked_reason: typeof record.blocked_reason === 'string' ? record.blocked_reason : null,
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
        primary_agent: isRuntimeProfileName(record.primary_agent) ? record.primary_agent : null,
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
}
