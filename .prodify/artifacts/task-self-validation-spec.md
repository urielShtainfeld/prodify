# Task Self-Validation Spec

Date: 2026-03-28
Scope: `./.prodify/tasks/*.md`

## Purpose
Define a lightweight, agent-executable validation contract that every Prodify task should run before execution and after producing its output artifact.

## Validation Model

### Pre-Run Checks
Run these checks before starting task execution:

1. Confirm the task file exists and contains the required frontmatter keys:
   - `task_id`
   - `reads`
   - `writes`
   - `next_task`
   - `mode`
2. Confirm every declared input artifact in `reads` exists, unless the task intentionally declares an empty `reads` list.
3. Confirm every declared template file referenced in the task's output specification exists.
4. Confirm the task's declared output artifact in `writes` matches the artifact described in the task body.
5. Confirm the output specification names an exact template file rather than a generic or freeform instruction.

### Post-Run Checks
Run these checks after task execution completes:

1. Confirm every declared output artifact in `writes` exists.
2. Confirm the output artifact contains the section headings defined by the matching template.
3. Confirm the artifact is Markdown when the task expects a Markdown artifact.
4. Confirm the produced artifact path matches the task's declared `writes` path.
5. Confirm the task did not omit required template sections, even if some sections are intentionally left brief.

## Failure Handling Rules

### Pre-Run Failure Rules
- If a required input artifact is missing, stop execution and report the missing path.
- If the required template file is missing, stop execution and report the missing template path.
- If the task metadata and task body disagree about the output artifact, stop execution and resolve the mismatch before proceeding.
- If the output specification allows a freeform artifact, stop execution and tighten the task instructions before proceeding.

### Post-Run Failure Rules
- If the declared output artifact was not created, mark the task as failed.
- If required template headings are missing, mark the artifact as invalid and revise it before moving to the next task.
- If the artifact was written to the wrong path, move or regenerate it at the declared path before continuing.
- If a section is present but empty because the data is unknown, note uncertainty explicitly instead of deleting the section.

## Execution Rules
- Keep validation file-based and heading-based.
- Prefer deterministic checks over subjective quality judgments.
- Do not treat deep content correctness as part of this self-validation layer.
- Allow conservative placeholders when the template expects a section but the data is not yet known.

## Task Integration Notes

### Task 01 - `01-understand.md`
- Expected inputs:
  - none
- Required template:
  - `.prodify/templates/orientation_map.template.md`
- Expected output:
  - `.prodify/artifacts/orientation_map.md`
- Required post-run headings:
  - `# Orientation Map`
  - `## Project Summary`
  - `## Entry Points`
  - `## Module Map`
  - `## Monorepo Metadata`
  - `## Dependency Overview`
  - `## Key Observations`
  - `## Uncertainty`

### Task 02 - `02-diagnose.md`
- Expected inputs:
  - `.prodify/artifacts/orientation_map.md`
- Required template:
  - `.prodify/templates/diagnostic_report.template.md`
- Expected output:
  - `.prodify/artifacts/diagnostic_report.md`
- Required post-run headings:
  - `# Diagnostic Report`
  - `## Top 5 Priorities`
  - `## Critical Issues`
  - `## High Issues`
  - `## Medium Issues`
  - `## Low Issues`
  - `## Reliability Risks`
  - `## Technical Debt Score`
  - `## Notes`

### Task 03 - `03-architecture.md`
- Expected inputs:
  - `.prodify/artifacts/orientation_map.md`
  - `.prodify/artifacts/diagnostic_report.md`
- Required template:
  - `.prodify/templates/architecture_spec.template.md`
- Expected output:
  - `.prodify/artifacts/architecture_spec.md`
- Required post-run headings:
  - `# Architecture Spec`
  - `## Detected Pattern`
  - `## Target Style`
  - `## Layer Definitions`
  - `## Violations`
  - `## Gap Analysis`
  - `## Migration Notes`

### Task 04 - `04-plan.md`
- Expected inputs:
  - `.prodify/artifacts/diagnostic_report.md`
  - `.prodify/artifacts/architecture_spec.md`
- Required template:
  - `.prodify/templates/refactor_plan.template.md`
- Expected output:
  - `.prodify/artifacts/refactor_plan.md`
- Required post-run headings:
  - `# Refactor Plan`
  - `## Summary`
  - `## Phase Breakdown`
  - `## Steps`
  - `## Notes`

### Task 05 - `05-refactor.md`
- Expected inputs:
  - `.prodify/artifacts/refactor_plan.md`
- Required template:
  - `.prodify/templates/implementation_summary.template.md`
- Expected output:
  - `.prodify/artifacts/implementation_summary.md`
- Required post-run headings:
  - `# Implementation Summary`
  - `## Step Executed`
  - `## Objective Achieved`
  - `## Files Changed`
  - `## Diff Summary`
  - `## Behavior Change Expected`
  - `## Notes`
- Special rule:
  - Validate only the summary artifact against the template. Source-file diffs are validated separately by task-specific review and verification.

### Task 06 - `06-validate.md`
- Expected inputs:
  - `.prodify/artifacts/architecture_spec.md`
  - `.prodify/artifacts/refactor_plan.md`
  - `.prodify/artifacts/implementation_summary.md`
- Required template:
  - `.prodify/templates/validation_report.template.md`
- Expected output:
  - `.prodify/artifacts/validation_report.md`
- Required post-run headings:
  - `# Validation Report`
  - `## Readiness Status`
  - `## Final Score`
  - `## Category Scores`
  - `## Remaining Issues`
  - `## Regressions Detected`
  - `## Recommended Next Step`

## Suggested Minimal Check Sequence
1. Read the task frontmatter.
2. Verify all input paths in `reads`.
3. Verify the named template path.
4. Execute the task.
5. Verify the output path in `writes`.
6. Verify required template headings in the output artifact.
7. Fail fast if any required file or heading is missing.

## Out Of Scope
- Semantic correctness of the artifact contents.
- Code quality or architecture judgment beyond file existence and template-shape compliance.
- Deep validation of modified source files produced during Task 05.
