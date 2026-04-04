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
                skill_routing: record.skill_routing
            },
            body: 'compiled-contract'
        },
        sourcePath: asString(record.source_path, 'source_path'),
        sourceHash: asString(record.source_hash, 'source_hash')
    });
}
