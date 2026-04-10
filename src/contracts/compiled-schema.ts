import { ProdifyError } from '../core/errors.js';
import { normalizeSourceContractDocument } from './source-schema.js';
import type { CompiledStageContract } from '../types.js';

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProdifyError(`Compiled contract field "${fieldName}" must be a non-empty string.`, {
      code: 'COMPILED_CONTRACT_INVALID'
    });
  }

  return value.trim();
}

export function validateCompiledContractShape(contract: unknown): CompiledStageContract {
  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
    throw new ProdifyError('Compiled contract must be a JSON object.', {
      code: 'COMPILED_CONTRACT_INVALID'
    });
  }

  const record = contract as Record<string, unknown>;
  const diffValidation = typeof record.diff_validation_rules === 'object' && record.diff_validation_rules !== null
    ? record.diff_validation_rules as Record<string, unknown>
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
        minimum_non_formatting_lines_changed: diffValidation.minimum_non_formatting_lines_changed ?? record.minimum_non_formatting_lines_changed,
        must_create_files: diffValidation.must_create_files ?? record.must_create_files,
        forbid_cosmetic_only_changes: diffValidation.forbid_cosmetic_only_changes ?? record.forbid_cosmetic_only_changes,
        minimum_hotspots_touched: diffValidation.minimum_hotspots_touched ?? record.minimum_hotspots_touched,
        required_structural_changes: diffValidation.required_structural_changes ?? record.required_structural_changes,
        min_impact_score: record.min_impact_score,
        minimum_breakdown_deltas: record.minimum_breakdown_deltas,
        maximum_negative_breakdown_delta: record.maximum_negative_breakdown_delta,
        enforce_plan_units: record.enforce_plan_units
      },
      body: 'compiled-contract'
    },
    sourcePath: asString(record.source_path, 'source_path'),
    sourceHash: asString(record.source_hash, 'source_hash')
  });
}
