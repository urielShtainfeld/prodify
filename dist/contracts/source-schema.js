import { normalizeRepoRelativePath } from '../core/paths.js';
import { ProdifyError } from '../core/errors.js';
import { stageToTaskId } from '../core/flow-state.js';
export const CONTRACT_STAGE_NAMES = ['understand', 'diagnose', 'architecture', 'plan', 'refactor', 'validate'];
function asString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ProdifyError(`Contract frontmatter field "${fieldName}" must be a non-empty string.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    return value.trim();
}
function asStringArray(value, fieldName) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new ProdifyError(`Contract frontmatter field "${fieldName}" must be a non-empty list.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    const normalized = value.map((entry) => asString(entry, fieldName));
    return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}
function asOptionalStringArray(value, fieldName) {
    if (!Array.isArray(value) || value.length === 0) {
        return [];
    }
    return asStringArray(value, fieldName);
}
function asStage(value) {
    const stage = asString(value, 'stage');
    if (!CONTRACT_STAGE_NAMES.includes(stage)) {
        throw new ProdifyError(`Contract frontmatter field "stage" is invalid: ${stage}.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    return stage;
}
function normalizeArtifactRule(rawValue) {
    if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
        throw new ProdifyError('Each required_artifacts entry must be a mapping.', {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    const record = rawValue;
    const path = normalizeRepoRelativePath(asString(record.path, 'required_artifacts.path'));
    const format = asString(record.format, 'required_artifacts.format');
    if (format !== 'markdown' && format !== 'json') {
        throw new ProdifyError(`Unsupported artifact format: ${format}.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    const requiredSections = asOptionalStringArray(record.required_sections, 'required_artifacts.required_sections');
    const requiredJsonKeys = asOptionalStringArray(record.required_json_keys, 'required_artifacts.required_json_keys');
    if (format === 'markdown' && requiredSections.length === 0) {
        throw new ProdifyError(`Markdown artifact "${path}" must declare required_sections.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    if (format === 'json' && requiredJsonKeys.length === 0) {
        throw new ProdifyError(`JSON artifact "${path}" must declare required_json_keys.`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    return {
        path,
        format,
        required_sections: requiredSections,
        required_json_keys: requiredJsonKeys
    };
}
export function normalizeSourceContractDocument(options) {
    const { document, sourcePath, sourceHash } = options;
    const stage = asStage(document.frontmatter.stage);
    const taskId = asString(document.frontmatter.task_id, 'task_id');
    if (taskId !== stageToTaskId(stage)) {
        throw new ProdifyError(`Contract task_id "${taskId}" does not match stage "${stage}".`, {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    if (document.body.trim().length === 0) {
        throw new ProdifyError(`Contract source "${sourcePath}" must contain explanatory body content.`, {
            code: 'CONTRACT_BODY_EMPTY'
        });
    }
    const rawArtifacts = document.frontmatter.required_artifacts;
    if (!Array.isArray(rawArtifacts) || rawArtifacts.length === 0) {
        throw new ProdifyError('Contract frontmatter field "required_artifacts" must contain at least one artifact rule.', {
            code: 'CONTRACT_SCHEMA_INVALID'
        });
    }
    const requiredArtifacts = rawArtifacts
        .map((artifact) => normalizeArtifactRule(artifact))
        .sort((left, right) => left.path.localeCompare(right.path));
    return {
        schema_version: String(document.frontmatter.schema_version ?? '1'),
        contract_version: asString(document.frontmatter.contract_version, 'contract_version'),
        stage,
        task_id: taskId,
        source_path: normalizeRepoRelativePath(sourcePath),
        source_hash: sourceHash,
        required_artifacts: requiredArtifacts,
        allowed_write_roots: asStringArray(document.frontmatter.allowed_write_roots, 'allowed_write_roots')
            .map((entry) => normalizeRepoRelativePath(entry)),
        forbidden_writes: Array.isArray(document.frontmatter.forbidden_writes)
            ? asStringArray(document.frontmatter.forbidden_writes, 'forbidden_writes').map((entry) => normalizeRepoRelativePath(entry))
            : [],
        policy_rules: asStringArray(document.frontmatter.policy_rules, 'policy_rules'),
        success_criteria: asStringArray(document.frontmatter.success_criteria, 'success_criteria')
    };
}
