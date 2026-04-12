import fs from 'node:fs/promises';

import { loadCompiledContract } from '../contracts/compiler.js';
import { diffAgainstRefactorBaseline, readRefactorBaselineSnapshot } from './diff-validator.js';
import { detectHotspots, detectHotspotsFromSnapshot, evaluateHotspotImprovements, summarizeHotspotMetrics } from './hotspots.js';
import { normalizeRepoRelativePath, resolveRepoPath } from './paths.js';
import { readPlanUnits, readSelectedRefactorStep } from './plan-units.js';
import { calculateCurrentImpactDelta, writeValidationScoreArtifacts } from '../scoring/model.js';
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

function touchedRepoPaths(diffResult: DiffResult): string[] {
  return [...new Set([
    ...diffResult.modifiedPaths,
    ...diffResult.addedPaths,
    ...diffResult.deletedPaths
  ])].sort((left, right) => left.localeCompare(right));
}

function categorizeUnmetRequirements(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues]
    .sort((left, right) => left.rule.localeCompare(right.rule) || left.message.localeCompare(right.message));
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
  let refactorImpactReport: StageValidationResult['refactor_impact_report'] | undefined;
  const effectiveDiffResult = diffResult ?? await diffAgainstRefactorBaseline(repoRoot);
  const persistedValidateScore = contract.stage === 'validate'
    ? await writeValidationScoreArtifacts(repoRoot, {
      runtimeState,
      minImpactScore: contract.min_impact_score > 0 ? contract.min_impact_score : undefined
    })
    : null;
  const impactDelta = persistedValidateScore?.delta
    ?? (contract.min_impact_score > 0 ? await calculateCurrentImpactDelta(repoRoot) : null);
  const baselineSnapshot = await readRefactorBaselineSnapshot(repoRoot);
  const hotspots = baselineSnapshot ? detectHotspotsFromSnapshot(baselineSnapshot) : await detectHotspots(repoRoot);
  const currentHotspots = await detectHotspots(repoRoot);
  const normalizedTouchedPaths = touchedPaths.map((entry) => normalizeRepoRelativePath(entry));
  const [planUnits, selectedPlanUnit] = contract.enforce_plan_units
    ? await Promise.all([
      readPlanUnits(repoRoot).catch(() => []),
      readSelectedRefactorStep(repoRoot).catch(() => null)
    ])
    : [[], null];

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
    if (planUnits.length === 0 && !selectedPlanUnit) {
      violatedRules.push(buildRule(
        'plan/unreadable',
        'Plan-unit validation could not read 04-plan.md or 05-refactor.md.'
      ));
    } else if (!selectedPlanUnit) {
      violatedRules.push(buildRule(
        'plan/selected-step-missing',
        'Refactor artifact does not declare the selected plan unit.'
      ));
    } else if (!planUnits.some((unit) => unit.id === selectedPlanUnit.id)) {
      violatedRules.push(buildRule(
        'plan/selected-step-invalid',
        `Selected refactor step ${selectedPlanUnit.id} does not exist in 04-plan.md.`
      ));
    } else {
      diagnostics.push(`validated selected plan unit ${selectedPlanUnit.id}`);
    }
  }

  if (effectiveDiffResult && (
    contract.diff_validation_rules.minimum_files_modified > 0
    || contract.diff_validation_rules.minimum_lines_changed > 0
    || contract.diff_validation_rules.minimum_non_formatting_lines_changed > 0
    || contract.diff_validation_rules.must_create_files
    || contract.diff_validation_rules.forbid_cosmetic_only_changes
    || contract.diff_validation_rules.minimum_hotspots_touched > 0
    || contract.diff_validation_rules.required_structural_changes.length > 0
  )) {
    const changedFiles = effectiveDiffResult.filesModified + effectiveDiffResult.filesAdded + effectiveDiffResult.filesDeleted;
    const changedLines = effectiveDiffResult.linesAdded + effectiveDiffResult.linesRemoved;
    const nonFormattingLines = effectiveDiffResult.nonFormattingLinesAdded + effectiveDiffResult.nonFormattingLinesRemoved;
    const formattingOnly = effectiveDiffResult.filesModified > 0
      && effectiveDiffResult.filesModified === effectiveDiffResult.formattingOnlyPaths.length
      && effectiveDiffResult.filesAdded === 0
      && effectiveDiffResult.filesDeleted === 0;
    const commentOnly = effectiveDiffResult.filesModified > 0
      && effectiveDiffResult.filesModified === effectiveDiffResult.commentOnlyPaths.length
      && effectiveDiffResult.filesAdded === 0
      && effectiveDiffResult.filesDeleted === 0;
    const cosmeticOnlyPaths = [...new Set([
      ...effectiveDiffResult.formattingOnlyPaths,
      ...effectiveDiffResult.commentOnlyPaths
    ])].sort((left, right) => left.localeCompare(right));
    const hotspotPathsTouched = hotspots
      .map((hotspot) => hotspot.path)
      .filter((hotspotPath) => normalizedTouchedPaths.includes(hotspotPath));
    const targetedHotspots = selectedPlanUnit?.hotspots ?? [];
    const hotspotImprovements = await evaluateHotspotImprovements(repoRoot, {
      before: hotspots,
      after: currentHotspots,
      touchedPaths: touchedRepoPaths(effectiveDiffResult)
    });
    const hotspotMetrics = summarizeHotspotMetrics(hotspots, currentHotspots, hotspotImprovements);
    const changedRepoPaths = touchedRepoPaths(effectiveDiffResult);

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

    if (nonFormattingLines < contract.diff_validation_rules.minimum_non_formatting_lines_changed) {
      violatedRules.push(buildRule(
        'diff/minimum-non-formatting-lines-changed',
        `Refactor changed ${nonFormattingLines} non-formatting lines but requires at least ${contract.diff_validation_rules.minimum_non_formatting_lines_changed}.`
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

    if (commentOnly) {
      violatedRules.push(buildRule(
        'diff/comment-only',
        'Refactor changes are comment-only and do not count as meaningful code change.'
      ));
    }

    if (contract.diff_validation_rules.forbid_cosmetic_only_changes && cosmeticOnlyPaths.length === changedFiles && changedFiles > 0) {
      violatedRules.push(buildRule(
        'diff/cosmetic-only',
        'Refactor changes are cosmetic-only and do not count as substantive repository change.'
      ));
    }

    if (!changedRepoPaths.some((entry) => entry.startsWith('src/'))) {
      violatedRules.push(buildRule(
        'diff/structural-relevance',
        'Refactor did not touch structurally relevant source files under src/.'
      ));
    }

    if (hotspots.length > 0 && hotspotPathsTouched.length < contract.diff_validation_rules.minimum_hotspots_touched) {
      violatedRules.push(buildRule(
        'hotspots/minimum-targets',
        `Refactor touched ${hotspotPathsTouched.length} hotspot files but requires at least ${contract.diff_validation_rules.minimum_hotspots_touched}.`
      ));
    }

    if (selectedPlanUnit?.files.length) {
      const untouchedPlanFiles = selectedPlanUnit.files.filter((entry) => !changedRepoPaths.includes(normalizeRepoRelativePath(entry)));
      if (untouchedPlanFiles.length === selectedPlanUnit.files.length) {
        violatedRules.push(buildRule(
          'plan/selected-step-files-untouched',
          `Refactor did not materially execute the selected plan unit files: ${selectedPlanUnit.files.join(', ')}.`
        ));
      }
    }

    if (targetedHotspots.length > 0 && !targetedHotspots.some((entry) => hotspotPathsTouched.includes(normalizeRepoRelativePath(entry)))) {
      violatedRules.push(buildRule(
        'hotspots/selected-targets-untouched',
        `Refactor did not touch the selected hotspot targets: ${targetedHotspots.join(', ')}.`
      ));
    }

    if (!hasRequiredStructuralChanges(effectiveDiffResult, contract.diff_validation_rules.required_structural_changes)) {
      violatedRules.push(buildRule(
        'diff/required-structural-changes',
        `Refactor is missing required structural changes: ${contract.diff_validation_rules.required_structural_changes.join(', ')}.`
      ));
    }

    diagnostics.push(`validated diff: files=${changedFiles}, lines=${changedLines}, non_formatting=${nonFormattingLines}, structural=${effectiveDiffResult.structuralChanges.structural_change_flags.join(',') || 'none'}, hotspots=${hotspotPathsTouched.join(',') || 'none'}`);
    refactorImpactReport = {
      changed_files: changedFiles,
      non_formatting_lines_changed: nonFormattingLines,
      cosmetic_only_paths: cosmeticOnlyPaths,
      targeted_hotspots: targetedHotspots,
      hotspots_touched: hotspotPathsTouched,
      hotspot_improvements: hotspotImprovements,
      hotspot_metrics: hotspotMetrics,
      structural_changes: effectiveDiffResult.structuralChanges.structural_change_flags,
      selected_plan_unit: selectedPlanUnit?.id ?? null
    };
  } else if (
    contract.diff_validation_rules.minimum_files_modified > 0
    || contract.diff_validation_rules.minimum_lines_changed > 0
    || contract.diff_validation_rules.minimum_non_formatting_lines_changed > 0
    || contract.diff_validation_rules.must_create_files
    || contract.diff_validation_rules.forbid_cosmetic_only_changes
    || contract.diff_validation_rules.minimum_hotspots_touched > 0
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

  if (impactDelta) {
    for (const [category, minimumDelta] of Object.entries(contract.minimum_breakdown_deltas)) {
      const key = category as keyof typeof impactDelta.breakdown_delta;
      const actualDelta = impactDelta.breakdown_delta[key];
      if (actualDelta < (minimumDelta ?? 0)) {
        violatedRules.push(buildRule(
          'impact-score/minimum-breakdown-threshold',
          `Impact score breakdown delta for ${key} is ${actualDelta} but requires at least ${minimumDelta}.`
        ));
      }
    }

    if (impactDelta.regressed_categories.some((category) => impactDelta.breakdown_delta[category] < (-1 * contract.maximum_negative_breakdown_delta))) {
      violatedRules.push(buildRule(
        'impact-score/breakdown-regression',
        `Impact score regressed beyond the allowed threshold in: ${impactDelta.regressed_categories.join(', ')}.`
      ));
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
    ...(impactDelta ? { score_delta: impactDelta } : {}),
    ...(violatedRules.length > 0 ? { unmet_requirements: categorizeUnmetRequirements(violatedRules) } : { unmet_requirements: [] }),
    enforcement_action: violatedRules.length === 0 ? 'pass' : (contract.stage === 'refactor' || contract.stage === 'validate') ? 'retry' : 'fail',
    ...(effectiveDiffResult ? { diff_result: effectiveDiffResult } : {}),
    ...(impactDelta ? { impact_score_delta: impactDelta.delta } : {}),
    ...(refactorImpactReport ? { refactor_impact_report: refactorImpactReport } : {})
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
