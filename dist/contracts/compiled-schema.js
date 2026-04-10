import { ProdifyError } from '../core/errors.js';
import { normalizeSourceContractDocument } from './source-schema.js';
function asString(value, fieldName) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ProdifyError(`Compiled contract field "${fieldName}" must be a non-empty string.`, {
            code: 'COMPILED_CONTRACT_INVALID'
        });
    }
    return value.trim();
}
export function validateCompiledContractShape(contract) {
    if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
        throw new ProdifyError('Compiled contract must be a JSON object.', {
            code: 'COMPILED_CONTRACT_INVALID'
        });
    }
    const record = contract;
    const diffValidation = typeof record.diff_validation_rules === 'object' && record.diff_validation_rules !== null
        ? record.diff_validation_rules
        : {};
    return normalizeSourceContractDocument({
        document: {
            frontmatter: {
                schema_version: record.schema_version,
                contract_version: record.contract_version,
                stage: record.stage,
                task_id: record.task_id,
                required_artifacts: record.required_artifacts,
                allowed_write_roots: record.allowed_write_roots,
                forbidden_writes: record.forbidden_writes,
                policy_rules: record.policy_rules,
                success_criteria: record.success_criteria,
                skill_routing: record.skill_routing,
                minimum_files_modified: diffValidation.minimum_files_modified ?? record.minimum_files_modified,
                minimum_lines_changed: diffValidation.minimum_lines_changed ?? record.minimum_lines_changed,
                must_create_files: diffValidation.must_create_files ?? record.must_create_files,
                required_structural_changes: diffValidation.required_structural_changes ?? record.required_structural_changes,
                min_impact_score: record.min_impact_score,
                enforce_plan_units: record.enforce_plan_units
            },
            body: 'compiled-contract'
        },
        sourcePath: asString(record.source_path, 'source_path'),
        sourceHash: asString(record.source_hash, 'source_hash')
    });
}
