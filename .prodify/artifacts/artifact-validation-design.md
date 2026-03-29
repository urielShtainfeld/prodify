# Artifact Validation Design

Date: 2026-03-28
Scope: `./.prodify/artifacts/*.md`

## Purpose
Define the validation layer that checks produced markdown artifacts against their matching templates before workflow state may advance.

This layer is responsible for artifact-shape validation only. It must confirm that:
- the expected artifact exists
- the artifact is written to the declared path
- the artifact contains the required template headings
- the artifact is complete enough to be considered structurally valid

This layer is not responsible for:
- choosing which task runs next
- mutating workflow state directly
- judging deep semantic correctness of the content
- validating source-code diffs from Task `05-refactor`

## Validation Scope
The artifact-validation layer runs after a task writes its primary artifact and before workflow advancement.

Inputs:
- produced artifact path from the task frontmatter `writes`
- matching template path from the task output specification
- required heading set derived from the template
- task ID and task metadata

Output:
- a deterministic validation result with:
  - `pass` or `fail`
  - failure reason category
  - missing or invalid sections
  - recommended next action

## Core Validation Rules

### Rule 1 - Expected Artifact Must Exist
- The artifact file must exist at the exact path declared in task frontmatter.
- If the expected path is missing, validation fails immediately.

### Rule 2 - Artifact Must Be Markdown
- The primary artifact must be a Markdown document for Tasks `01` through `06`.
- If the produced file is not Markdown or cannot be parsed as structured markdown text, validation fails.

### Rule 3 - Template Heading Coverage
- Every required heading from the matching template must be present in the artifact.
- Heading order must follow the template order.
- Required headings may contain brief or uncertain content, but they may not be omitted.

### Rule 4 - No Critical Structural Drift
- The artifact may include small clarifying subsections only if they do not obscure the required template structure.
- If the artifact removes, renames, or reorders required headings in a way that breaks downstream parsing, validation fails.

### Rule 5 - Partial Output Is Invalid
- If the artifact stops partway through the required structure, validation fails.
- Empty artifacts, truncated artifacts, or artifacts missing required late sections are invalid.

### Rule 6 - Declared Output Path Wins
- If content was written to a different path than the task's declared `writes` path, validation fails even if the content is otherwise correct.

## Validation Rules Per Artifact

### `orientation_map.md`
- Template:
  - `.prodify/templates/orientation_map.template.md`
- Required headings:
  - `# Orientation Map`
  - `## Project Summary`
  - `## Entry Points`
  - `## Module Map`
  - `## Monorepo Metadata`
  - `## Dependency Overview`
  - `## Key Observations`
  - `## Uncertainty`
- Pass rule:
  - all headings exist in order and the file is non-empty

### `diagnostic_report.md`
- Template:
  - `.prodify/templates/diagnostic_report.template.md`
- Required headings:
  - `# Diagnostic Report`
  - `## Top 5 Priorities`
  - `## Critical Issues`
  - `## High Issues`
  - `## Medium Issues`
  - `## Low Issues`
  - `## Reliability Risks`
  - `## Technical Debt Score`
  - `## Notes`
- Pass rule:
  - all headings exist in order and the report reaches the final `## Notes` section

### `architecture_spec.md`
- Template:
  - `.prodify/templates/architecture_spec.template.md`
- Required headings:
  - `# Architecture Spec`
  - `## Detected Pattern`
  - `## Target Style`
  - `## Layer Definitions`
  - `## Violations`
  - `## Gap Analysis`
  - `## Migration Notes`
- Pass rule:
  - all headings exist in order and layer/violation sections are structurally present

### `refactor_plan.md`
- Template:
  - `.prodify/templates/refactor_plan.template.md`
- Required headings:
  - `# Refactor Plan`
  - `## Summary`
  - `## Phase Breakdown`
  - `## Steps`
  - `## Notes`
- Additional structural requirement:
  - at least one `### Step ID:` block must appear under `## Steps`
- Pass rule:
  - all headings exist in order and at least one step block is present

### `implementation_summary.md`
- Template:
  - `.prodify/templates/implementation_summary.template.md`
- Required headings:
  - `# Implementation Summary`
  - `## Step Executed`
  - `## Objective Achieved`
  - `## Files Changed`
  - `## Diff Summary`
  - `## Behavior Change Expected`
  - `## Notes`
- Pass rule:
  - all headings exist in order
- Special rule:
  - validate only the summary artifact, not the modified source files

### `validation_report.md`
- Template:
  - `.prodify/templates/validation_report.template.md`
- Required headings:
  - `# Validation Report`
  - `## Readiness Status`
  - `## Final Score`
  - `## Category Scores`
  - `## Remaining Issues`
  - `## Regressions Detected`
  - `## Recommended Next Step`
- Pass rule:
  - all headings exist in order and the file reaches the final next-step section

## Error Handling

### Missing Artifact
Condition:
- the expected artifact path does not exist

Result:
- fail validation
- report `missing_artifact`
- do not advance workflow state
- require the task to regenerate the artifact

### Wrong Output Path
Condition:
- an artifact was produced, but not at the declared `writes` path

Result:
- fail validation
- report `wrong_output_path`
- require the artifact to be rewritten or moved to the declared path before continuing

### Missing Required Heading
Condition:
- one or more required template headings are absent

Result:
- fail validation
- report `missing_required_heading`
- list the missing headings explicitly
- require artifact correction before continuing

### Heading Order Drift
Condition:
- required headings exist but are reordered in a way that breaks the template contract

Result:
- fail validation
- report `invalid_heading_order`
- require the artifact to be rewritten to match template order

### Partial Artifact
Condition:
- the artifact contains some required headings but stops early or omits required trailing sections

Result:
- fail validation
- report `partial_artifact`
- require regeneration or completion of the artifact

### Structurally Empty Section
Condition:
- a required heading exists but the section is completely empty with no uncertainty note, placeholder, or minimal content

Result:
- fail validation
- report `empty_required_section`
- require the section to be populated or explicitly marked uncertain

## Pass/Fail Criteria

### PASS
Validation passes only when:
- the artifact exists at the declared path
- the artifact matches the expected Markdown shape
- all required headings are present
- required headings appear in template order
- no required section is structurally empty without explanation

### FAIL
Validation fails if any of the following are true:
- artifact missing
- artifact written to the wrong path
- missing required heading
- invalid heading order
- partial artifact
- structurally empty required section

## Workflow Impact When Validation Fails
- Do not advance workflow state.
- Do not update `last_completed_task` to the task being validated.
- Mark the task outcome as failed or blocked according to run-state rules:
  - use `blocked` when a file/path/template precondition is missing
  - use `failed` when the artifact was produced but is structurally invalid
- Record the failure reason in `run_state.json` notes.
- Append the failure to `task_log.json`.
- Require the artifact to be corrected and revalidated before the next task may run.

## Integration Notes

### Relationship To Self-Validation
- The self-validation layer checks task preconditions and broad post-run expectations.
- The artifact-validation layer is narrower and authoritative for final template-shape validation.
- Artifact validation should run after the task writes its artifact and before workflow state transitions.

### Relationship To Dispatcher
- The dispatcher chooses the task and expected output path.
- The artifact-validation layer verifies the produced artifact after execution.
- The dispatcher must not treat a task as successful until artifact validation passes.

### Relationship To Run-State Logic
- The run-state layer decides how PASS or FAIL changes workflow state.
- The artifact-validation layer returns structured results that the run-state updater consumes.

## Suggested Validation Result Shape
```json
{
  "task_id": "02-diagnose",
  "artifact_path": ".prodify/artifacts/diagnostic_report.md",
  "template_path": ".prodify/templates/diagnostic_report.template.md",
  "status": "fail",
  "reason": "missing_required_heading",
  "details": [
    "Missing heading: ## Technical Debt Score"
  ],
  "recommended_next_action": "Regenerate or correct the artifact before advancing workflow state."
}
```

## Implementation Notes
- Derive required heading lists directly from templates.
- Treat heading presence and order as deterministic checks.
- Prefer failing fast with explicit reasons over trying to auto-repair artifacts.
- Keep the validation layer reusable across all current primary artifacts.
