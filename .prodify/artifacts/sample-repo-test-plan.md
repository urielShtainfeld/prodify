# Sample Repo Test Plan

Date: 2026-03-29
Scope: first end-to-end Prodify trial on a representative messy repository

## Repo Profile

Use a medium-sized application repository with these characteristics:

- 20 to 80 source files
- one primary runtime or app entrypoint
- inconsistent module boundaries
- duplicated logic in at least a few files
- weak naming consistency
- partial or outdated tests
- no fully reliable architecture document

Preferred technology profile:

- common application stack such as TypeScript, JavaScript, Python, or similar mainstream codebase
- simple enough to inspect in one run, but messy enough to require diagnosis and planning

Required messiness signals:

- at least 5 concrete maintainability issues
- at least 1 architectural smell
- at least 1 safe refactor step that can be isolated

## Execution Steps

Run the first end-to-end evaluation with this task sequence:

1. `01-understand`
2. `02-diagnose`
3. `03-architecture`
4. `04-plan`
5. one controlled `05-refactor`
6. immediate `06-validate`

This first sample run should stop after the first full `05 -> 06` cycle unless the test operator explicitly wants to continue looping.

## Checkpoints

### Checkpoint 1 - Orientation Completed
After `01-understand`, confirm:

- `orientation_map.md` exists
- the repo shape, entrypoints, and major subsystems are mapped

### Checkpoint 2 - Diagnosis Completed
After `02-diagnose`, confirm:

- `diagnostic_report.md` exists
- issues are categorized and prioritized

### Checkpoint 3 - Architecture Proposal Completed
After `03-architecture`, confirm:

- `architecture_spec.md` exists
- proposed structure addresses the main diagnosis findings

### Checkpoint 4 - Refactor Plan Ready
After `04-plan`, confirm:

- `refactor_plan.md` exists
- steps are isolated and safe to execute one at a time
- at least one step has a clear step ID

### Checkpoint 5 - Controlled Refactor Executed
After the first `05-refactor`, confirm:

- exactly one step was implemented
- `implementation_summary.md` exists
- scope stayed within the selected step

### Checkpoint 6 - Validation Completed
After `06-validate`, confirm:

- `validation_report.md` exists
- validation result is clear enough to decide pass, fail, or inconclusive
- state and task log reflect the loop outcome

## Expected Artifacts And Checkpoints

Expected primary artifacts:

- `.prodify/artifacts/orientation_map.md`
- `.prodify/artifacts/diagnostic_report.md`
- `.prodify/artifacts/architecture_spec.md`
- `.prodify/artifacts/refactor_plan.md`
- `.prodify/artifacts/implementation_summary.md`
- `.prodify/artifacts/validation_report.md`

Expected control artifacts:

- `.prodify/artifacts/run_state.json`
- `.prodify/artifacts/task_log.json`

Expected checkpoint evidence:

- each task writes exactly one primary artifact
- state advances deterministically
- task log records each attempt append-only

## Success Criteria

The sample-repo test is successful when:

- the full `01 -> 06` sequence can be planned and executed conceptually against the sample profile
- each task has a clear expected artifact
- the first refactor step is narrow and testable
- validation can clearly report pass, fail, or inconclusive
- the resulting artifacts are sufficient to explain what changed and what should happen next

## Failure Conditions

Treat the sample plan as failed if:

- the sample repo is too clean to stress diagnosis and planning
- the repo is so chaotic that no isolated first refactor step can be selected
- the task sequence requires undocumented manual interpretation to continue
- success cannot be judged from artifacts and state alone

## Practical Test Notes

- Prefer a repo with known maintainability problems but low operational risk.
- Avoid a repo that depends on hidden infrastructure to understand the code at a basic level.
- Avoid a repo so small that the full pipeline becomes trivial and fails to exercise the system.
- For the first sample run, one validated refactor loop is enough to prove the workflow shape before scaling up.
