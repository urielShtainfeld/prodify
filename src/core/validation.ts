import fs from 'node:fs/promises';

import { loadCompiledContract } from '../contracts/compiler.js';
import { diffAgainstRefactorBaseline } from './diff-validator.js';
import { normalizeRepoRelativePath, resolveRepoPath } from './paths.js';
import { readPlanUnits, readSelectedRefactorStep } from './plan-units.js';
import { calculateCurrentImpactDelta } from '../scoring/model.js';
import type { CompiledStageContract, DiffResult, FlowStage, ProdifyState, StageValidationResult, ValidationIssue } from '../types.js';

function pathIsWithin(pathToCheck: string, root: string): boolean {
  const normalizedPath = normalizeRepoRelativePath(pathToCheck);
  const normalizedRoot = normalizeRepoRelativePath(root);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot.replace(/\/$/, '')}/`);
}

function collectMarkdownSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (currentHeading) {
      sections.set(currentHeading, buffer.join('\n').trim());
    }
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[2].trim();
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  flush();
  return sections;
}

function containsAllStatements(sectionContent: string, statements: string[]): boolean {
  return statements.every((statement) => sectionContent.includes(statement));
}

function buildRule(rule: string, message: string, path?: string): ValidationIssue {
  return { rule, message, path };
}

function hasRequiredStructuralChanges(diffResult: DiffResult, requiredChanges: string[]): boolean {
  if (requiredChanges.length === 0) {
    return true;
  }

  return requiredChanges.every((requiredChange) => diffResult.structuralChanges.structural_change_flags.includes(requiredChange));
}

async function validateArtifact(
  repoRoot: string,
  contract: CompiledStageContract,
  artifact: CompiledStageContract['required_artifacts'][number]
): Promise<{ issues: ValidationIssue[]; missing: string[]; diagnostics: string[] }> {
  const artifactPath = resolveRepoPath(repoRoot, artifact.path);
  const issues: ValidationIssue[] = [];
  const missing: string[] = [];
  const diagnostics: string[] = [];

  try {
    const content = await fs.readFile(artifactPath, 'utf8');
    diagnostics.push(`validated artifact ${artifact.path}`);

    if (artifact.format === 'markdown') {
      const sections = collectMarkdownSections(content);
      for (const section of artifact.required_sections) {
        if (!sections.has(section)) {
          issues.push(buildRule(
            'artifact/markdown-section-missing',
            `Markdown artifact ${artifact.path} is missing section "${section}".`,
            artifact.path
          ));
        }
      }

      const successCriteriaSection = sections.get('Success Criteria') ?? '';
      if (contract.success_criteria.length > 0 && !containsAllStatements(successCriteriaSection, contract.success_criteria)) {
        issues.push(buildRule(
          'artifact/success-criteria-missing',
          `Markdown artifact ${artifact.path} does not document all success criteria.`,
          artifact.path
        ));
      }

      const policyChecksSection = sections.get('Policy Checks') ?? '';
      if (contract.policy_rules.length > 0 && !containsAllStatements(policyChecksSection, contract.policy_rules)) {
        issues.push(buildRule(
          'artifact/policy-rules-missing',
          `Markdown artifact ${artifact.path} does not document all policy checks.`,
          artifact.path
        ));
      }
    } else {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      for (const key of artifact.required_json_keys) {
        if (!(key in parsed)) {
          issues.push(buildRule(
            'artifact/json-key-missing',
            `JSON artifact ${artifact.path} is missing key "${key}".`,
            artifact.path
          ));
        }
      }
    }
  } catch {
    missing.push(artifact.path);
    issues.push(buildRule(
      'artifact/missing',
      `Required artifact ${artifact.path} is missing.`,
      artifact.path
    ));
  }

  return {
    issues,
    missing,
    diagnostics
  };
}

export async function validateStageOutputs(
  repoRoot: string,
  {
    contract,
    runtimeState,
    touchedPaths = [],
    diffResult = null
  }: {
    contract: CompiledStageContract;
    runtimeState: ProdifyState;
    touchedPaths?: string[];
    diffResult?: DiffResult | null;
  }
): Promise<StageValidationResult> {
  const violatedRules: ValidationIssue[] = [];
  const missingArtifacts: string[] = [];
  const diagnostics: string[] = [];
  const warnings: string[] = [];
  const effectiveDiffResult = diffResult ?? await diffAgainstRefactorBaseline(repoRoot);
  const impactDelta = contract.min_impact_score > 0
    ? await calculateCurrentImpactDelta(repoRoot)
    : null;

  if (runtimeState.runtime.current_stage !== contract.stage) {
    violatedRules.push(buildRule(
      'runtime/stage-mismatch',
      `Runtime stage ${runtimeState.runtime.current_stage ?? 'none'} does not match contract stage ${contract.stage}.`
    ));
  }

  for (const artifact of contract.required_artifacts) {
    const artifactValidation = await validateArtifact(repoRoot, contract, artifact);
    violatedRules.push(...artifactValidation.issues);
    missingArtifacts.push(...artifactValidation.missing);
    diagnostics.push(...artifactValidation.diagnostics);
  }

  for (const rawTouchedPath of touchedPaths.map((entry) => normalizeRepoRelativePath(entry))) {
    if (!contract.allowed_write_roots.some((root) => pathIsWithin(rawTouchedPath, root))) {
      violatedRules.push(buildRule(
        'writes/outside-allowed-roots',
        `Touched path ${rawTouchedPath} is outside the contract write boundary.`,
        rawTouchedPath
      ));
    }

    if (contract.forbidden_writes.some((entry) => pathIsWithin(rawTouchedPath, entry))) {
      violatedRules.push(buildRule(
        'writes/forbidden',
        `Touched path ${rawTouchedPath} is forbidden by the contract.`,
        rawTouchedPath
      ));
    }
  }

  if (touchedPaths.length === 0) {
    warnings.push('No touched paths were provided; forbidden-write checks are limited to required artifacts.');
  }

  if (contract.enforce_plan_units) {
    try {
      const [planUnits, selectedStep] = await Promise.all([
        readPlanUnits(repoRoot),
        readSelectedRefactorStep(repoRoot)
      ]);
      if (!selectedStep) {
        violatedRules.push(buildRule(
          'plan/selected-step-missing',
          'Refactor artifact does not declare the selected plan unit.'
        ));
      } else if (!planUnits.some((unit) => unit.id === selectedStep.id)) {
        violatedRules.push(buildRule(
          'plan/selected-step-invalid',
          `Selected refactor step ${selectedStep.id} does not exist in 04-plan.md.`
        ));
      } else {
        diagnostics.push(`validated selected plan unit ${selectedStep.id}`);
      }
    } catch {
      violatedRules.push(buildRule(
        'plan/unreadable',
        'Plan-unit validation could not read 04-plan.md or 05-refactor.md.'
      ));
    }
  }

  if (effectiveDiffResult && (
    contract.diff_validation_rules.minimum_files_modified > 0
    || contract.diff_validation_rules.minimum_lines_changed > 0
    || contract.diff_validation_rules.must_create_files
    || contract.diff_validation_rules.required_structural_changes.length > 0
  )) {
    const changedFiles = effectiveDiffResult.filesModified + effectiveDiffResult.filesAdded + effectiveDiffResult.filesDeleted;
    const changedLines = effectiveDiffResult.linesAdded + effectiveDiffResult.linesRemoved;
    const formattingOnly = effectiveDiffResult.filesModified > 0
      && effectiveDiffResult.filesModified === effectiveDiffResult.formattingOnlyPaths.length
      && effectiveDiffResult.filesAdded === 0
      && effectiveDiffResult.filesDeleted === 0;

    if (changedFiles < contract.diff_validation_rules.minimum_files_modified) {
      violatedRules.push(buildRule(
        'diff/minimum-files-modified',
        `Refactor changed ${changedFiles} files but requires at least ${contract.diff_validation_rules.minimum_files_modified}.`
      ));
    }

    if (changedLines < contract.diff_validation_rules.minimum_lines_changed) {
      violatedRules.push(buildRule(
        'diff/minimum-lines-changed',
        `Refactor changed ${changedLines} lines but requires at least ${contract.diff_validation_rules.minimum_lines_changed}.`
      ));
    }

    if (contract.diff_validation_rules.must_create_files && effectiveDiffResult.filesAdded === 0) {
      violatedRules.push(buildRule(
        'diff/must-create-files',
        'Refactor must create at least one new file.'
      ));
    }

    if (formattingOnly) {
      violatedRules.push(buildRule(
        'diff/formatting-only',
        'Refactor changes are formatting-only and do not count as meaningful code change.'
      ));
    }

    if (!hasRequiredStructuralChanges(effectiveDiffResult, contract.diff_validation_rules.required_structural_changes)) {
      violatedRules.push(buildRule(
        'diff/required-structural-changes',
        `Refactor is missing required structural changes: ${contract.diff_validation_rules.required_structural_changes.join(', ')}.`
      ));
    }

    diagnostics.push(`validated diff: files=${changedFiles}, lines=${changedLines}, structural=${effectiveDiffResult.structuralChanges.structural_change_flags.join(',') || 'none'}`);
  } else if (
    contract.diff_validation_rules.minimum_files_modified > 0
    || contract.diff_validation_rules.minimum_lines_changed > 0
    || contract.diff_validation_rules.must_create_files
    || contract.diff_validation_rules.required_structural_changes.length > 0
  ) {
    violatedRules.push(buildRule(
      'diff/baseline-missing',
      'Diff validation rules are configured but no refactor baseline snapshot was available.'
    ));
  }

  if (contract.min_impact_score > 0) {
    if (!impactDelta) {
      violatedRules.push(buildRule(
        'impact-score/missing-baseline',
        'Impact score threshold is configured but no baseline score is available.'
      ));
    } else if (impactDelta.delta < contract.min_impact_score) {
      violatedRules.push(buildRule(
        'impact-score/minimum-threshold',
        `Impact score delta ${impactDelta.delta} is below the required threshold ${contract.min_impact_score}.`
      ));
    } else {
      diagnostics.push(`validated impact score delta ${impactDelta.delta}`);
    }
  }

  return {
    stage: contract.stage,
    contract_version: contract.contract_version,
    passed: violatedRules.length === 0,
    violated_rules: violatedRules,
    missing_artifacts: [...new Set(missingArtifacts)].sort((left, right) => left.localeCompare(right)),
    warnings,
    diagnostics,
    ...(effectiveDiffResult ? { diff_result: effectiveDiffResult } : {}),
    ...(impactDelta ? { impact_score_delta: impactDelta.delta } : {})
  };
}

export async function validateStageOutputsForCurrentState(
  repoRoot: string,
  {
    runtimeState,
    touchedPaths = [],
    diffResult = null
  }: {
    runtimeState: ProdifyState;
    touchedPaths?: string[];
    diffResult?: DiffResult | null;
  }
): Promise<StageValidationResult> {
  const stage = runtimeState.runtime.current_stage;
  if (!stage) {
    throw new Error('Cannot validate stage outputs when no stage is active.');
  }

  const contract = await loadCompiledContract(repoRoot, stage);
  return validateStageOutputs(repoRoot, {
    contract,
    runtimeState,
    touchedPaths,
    diffResult
  });
}

export async function validateStageOutputsForStage(
  repoRoot: string,
  {
    stage,
    runtimeState,
    touchedPaths = [],
    diffResult = null
  }: {
    stage: FlowStage;
    runtimeState: ProdifyState;
    touchedPaths?: string[];
    diffResult?: DiffResult | null;
  }
): Promise<StageValidationResult> {
  const contract = await loadCompiledContract(repoRoot, stage);
  return validateStageOutputs(repoRoot, {
    contract,
    runtimeState,
    touchedPaths,
    diffResult
  });
}
