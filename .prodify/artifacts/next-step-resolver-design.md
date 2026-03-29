# Next Step Resolver Design

Date: 2026-03-29
Scope: `./.prodify/`

## Purpose

Define deterministic logic for deciding what Prodify should do next without user guidance.

The resolver answers three questions on every cycle:

- what task should run next
- whether execution should stop
- whether execution should resume, retry, or block

The resolver must use verified state only. It must not infer workflow progress from memory.

## Canonical Inputs

### Primary Input
- `.prodify/artifacts/run_state.json`
  - canonical source for:
    - `current_task`
    - `last_completed_task`
    - `next_task`
    - `selected_refactor_step`
    - `completed_step_ids`
    - `status`
    - `notes`

### Secondary Inputs
- `.prodify/artifacts/task_log.json`
  - confirms prior execution history
  - helps distinguish a true fresh start from an inconsistent partial state
- `.prodify/artifacts/validation_report.md`
  - used only when validation state or validation outcome must be confirmed
  - never overrides `run_state.json`

### Supporting Design Inputs
- `./.prodify/artifacts/run-state-design.md`
- `./.prodify/artifacts/task-dispatcher-design.md`
- `./.prodify/artifacts/refactor-validate-loop-design.md`
- `./.prodify/artifacts/completed-steps-tracking.md`
- `./.prodify/artifacts/planning-alignment-report.md`

## Canonical Resolution Model

Use this canonical loop model for next-step resolution:

- after Task `05-refactor`, the next task is always Task `06-validate`
- after Task `06-validate` PASS:
  - continue to the next remaining refactor step if one exists
  - otherwise stop complete
- after Task `06-validate` FAIL:
  - retry or repair the same selected step
  - do not auto-advance to a later step
- after inconclusive validation:
  - block until validation can be rerun or repaired

This intentionally follows the newer design set rather than the outdated PASS/FAIL wording in `AGENTS.md`.

## Resolver Outputs

The resolver returns one structured decision with:

- `decision`
  - one of:
    - `dispatch`
    - `resume`
    - `retry`
    - `stop_complete`
    - `stop_blocked`
    - `stop_failed`
- `resolved_task`
  - task ID to run next, or `null`
- `reason`
  - short deterministic explanation
- `resume_condition`
  - what must be true before execution may continue
- `state_requirements`
  - fields or artifacts that must be corrected first, if any

## Resolution Order

Resolve in this strict order:

1. Validate `run_state.json` presence and required fields.
2. Validate status-specific state invariants.
3. If needed, corroborate fresh-start or failure context using `task_log.json`.
4. If needed, corroborate validation outcome using `validation_report.md`.
5. Return exactly one decision.

Higher-priority failures always win over lower-priority dispatch opportunities.

## Schema And State Gate

### Required Run-State Fields
The resolver requires:

- `current_task`
- `last_completed_task`
- `next_task`
- `selected_refactor_step`
- `completed_step_ids`
- `status`

If any required field is missing:

- return `decision: stop_blocked`
- return `resolved_task: null`
- reason: `run_state_schema_incomplete`

This applies to the current on-disk `run_state.json`, which still lacks `completed_step_ids`.

### Required Status Values
Allowed `status` values:

- `ready`
- `running`
- `awaiting_validation`
- `blocked`
- `failed`
- `complete`

Unknown status resolves to:

- `decision: stop_failed`
- reason: `unsupported_status`

## Decision Table

| Status | Additional condition | Decision | Resolved task | Resume condition |
| --- | --- | --- | --- | --- |
| `ready` | `next_task` valid and state consistent | `dispatch` | `next_task` | state already runnable |
| `ready` | `next_task` is `05-refactor` and selected step valid | `dispatch` | `05-refactor` | selected step exists and is not completed |
| `ready` | `next_task` is `05-refactor` and no step can be selected | `stop_blocked` | `null` | repair plan or state |
| `running` | `current_task` valid | `resume` | `current_task` | resume the interrupted task only |
| `awaiting_validation` | selected step present and Task `05` completed | `dispatch` | `06-validate` | validation must run now |
| `awaiting_validation` | selected step missing or Task `05` context invalid | `stop_failed` | `null` | repair invalid loop state |
| `blocked` | blocker note present and issue unresolved | `stop_blocked` | `null` | resolve blocker, then recompute |
| `failed` | retryable task and failure is understood | `retry` | `next_task` | correct failure cause first |
| `failed` | no deterministic retry target | `stop_failed` | `null` | reconcile state manually |
| `complete` | terminal state valid | `stop_complete` | `null` | none |

## Status Resolution Rules

### Rule 1 - `ready`

When `status` is `ready`:

- use `next_task` as the candidate task
- verify it is valid for the pipeline or refactor loop
- if `next_task` is `05-refactor`, confirm:
  - `selected_refactor_step` is set or can be selected deterministically
  - the step is not already in `completed_step_ids`
  - the step exists in `refactor_plan.md`

If those checks pass:

- `decision: dispatch`
- `resolved_task: next_task`

If those checks fail:

- `decision: stop_blocked`
- reason: `refactor_step_unresolvable`

### Rule 2 - `running`

When `status` is `running`:

- ignore `next_task` for dispatch purposes
- resume `current_task`
- do not advance to another task

If `current_task` is null:

- `decision: stop_failed`
- reason: `running_without_current_task`

### Rule 3 - `awaiting_validation`

When `status` is `awaiting_validation`:

- require `next_task: "06-validate"`
- require non-null `selected_refactor_step`
- require `last_completed_task: "05-refactor"`

If all checks pass:

- `decision: dispatch`
- `resolved_task: "06-validate"`

If any check fails:

- `decision: stop_failed`
- reason: `invalid_awaiting_validation_state`

### Rule 4 - `blocked`

When `status` is `blocked`:

- do not dispatch any task
- return the blocker reason from `notes`
- require explicit repair before recomputing the next step

Resolver output:

- `decision: stop_blocked`
- `resolved_task: null`

### Rule 5 - `failed`

When `status` is `failed`:

- never auto-advance to a later task
- use `next_task` only as a retry target
- prefer retrying Task `05-refactor` for the same selected step after validation FAIL
- never choose a new step while failure is unresolved

If the state identifies a deterministic retry:

- `decision: retry`
- `resolved_task: next_task`

If retry target or selected-step context is inconsistent:

- `decision: stop_failed`
- reason: `retry_target_unresolvable`

### Rule 6 - `complete`

When `status` is `complete`:

- require `current_task: null`
- require `next_task: null`

If both conditions hold:

- `decision: stop_complete`

Otherwise:

- `decision: stop_failed`
- reason: `invalid_complete_state`

## Validation Outcome Resolution

The resolver consults `validation_report.md` only when it needs to confirm the meaning of Task `06` output.

### PASS
Treat validation as PASS only when:

- `run_state.json` already reflects successful validation semantics, or
- `validation_report.md` explicitly records `PASS`

PASS resolves to:

- append/select behavior handled by state-update logic
- resolver chooses:
  - `05-refactor` if more valid steps remain
  - `stop_complete` if no valid steps remain

### FAIL
Treat validation as FAIL only when:

- `run_state.json` is in a failed retry state, or
- `validation_report.md` explicitly records `FAIL`

FAIL resolves to:

- `decision: retry`
- `resolved_task: "05-refactor"` if the failed step is still valid

### Inconclusive
If `validation_report.md` is missing, template-only, interrupted, or lacks a trustworthy PASS/FAIL result:

- `decision: stop_blocked`
- `reason: validation_inconclusive`

This applies to the current template-shaped `validation_report.md`.

## Task History Resolution

Use `task_log.json` only as corroborating evidence.

### Fresh Start Confirmation
Treat the run as a fresh start only when all of the following are true:

- `last_completed_task` is `null`
- `next_task` is `01-understand`
- `current_task` is `null` or `01-understand`
- `task_log.json` contains no executions

Then resolve:

- `decision: dispatch`
- `resolved_task: "01-understand"`

### History Conflict
If task history contradicts state, for example:

- `task_log.json` shows later tasks but `run_state.json` looks fresh
- `run_state.json` claims completion but history stops mid-pipeline

Then:

- prefer `run_state.json` as canonical
- return `decision: stop_blocked`
- reason: `state_history_conflict`

## Refactor Loop Resolution

### Selecting Work After Validation PASS
If the current state reflects Task `06` PASS:

1. confirm the completed step is present in `completed_step_ids`
2. ask the step-selection logic for the next remaining valid step
3. if a next step exists:
   - `decision: dispatch`
   - `resolved_task: "05-refactor"`
4. if no steps remain:
   - `decision: stop_complete`

### Retrying After Validation FAIL
If Task `06` failed:

- keep the same `selected_refactor_step`
- keep `completed_step_ids` unchanged
- resolve to retry Task `05-refactor`

### Inconclusive Validation
If Task `06` output is inconclusive:

- do not choose a new step
- do not mark the workflow complete
- return `stop_blocked`

## Edge Cases

### Edge Case 1 - Missing `completed_step_ids`
If `run_state.json` lacks `completed_step_ids`:

- do not assume `[]`
- return `stop_blocked`
- require schema repair

### Edge Case 2 - Template-Only `validation_report.md`
If the validation report still contains placeholder `PASS/FAIL:` lines without a resolved outcome:

- treat validation as inconclusive
- block instead of guessing PASS or FAIL

### Edge Case 3 - `ready` With `05-refactor` But No Selected Step
If state says `ready` and `next_task` is `05-refactor`, but no valid selected step exists:

- block on planning or selection repair

### Edge Case 4 - Completed Step Still Selected For Retry
If `selected_refactor_step` is already present in `completed_step_ids` while state expects a retry:

- return `stop_failed`
- reason: `selected_step_already_completed`

### Edge Case 5 - `complete` With Remaining Task
If `status` is `complete` but `next_task` is non-null:

- return `stop_failed`
- reason: `complete_state_not_terminal`

### Edge Case 6 - Unknown Validation Outcome After Task `05`
If Task `05` completed but the system cannot prove that Task `06` ran or what it concluded:

- require `06-validate` if state is still `awaiting_validation`
- otherwise block on validation ambiguity

### Edge Case 7 - Failed State Points To A New Step
If `status` is `failed` but `next_task` or `selected_refactor_step` points to a different untried step instead of the failed one:

- return `stop_failed`
- reason: `illegal_skip_after_failure`

## Examples

### Example 1 - Fresh Start
Input state:

```json
{
  "current_task": null,
  "last_completed_task": null,
  "next_task": "01-understand",
  "selected_refactor_step": null,
  "completed_step_ids": [],
  "status": "ready",
  "artifacts_dir": ".prodify/artifacts",
  "notes": []
}
```

Resolver output:

```json
{
  "decision": "dispatch",
  "resolved_task": "01-understand",
  "reason": "fresh_start_ready",
  "resume_condition": "state already runnable",
  "state_requirements": []
}
```

### Example 2 - Mid-Pipeline
Input state:

```json
{
  "current_task": null,
  "last_completed_task": "03-architecture",
  "next_task": "04-plan",
  "selected_refactor_step": null,
  "completed_step_ids": [],
  "status": "ready",
  "artifacts_dir": ".prodify/artifacts",
  "notes": []
}
```

Resolver output:

```json
{
  "decision": "dispatch",
  "resolved_task": "04-plan",
  "reason": "linear_pipeline_ready",
  "resume_condition": "state already runnable",
  "state_requirements": []
}
```

### Example 3 - Awaiting Validation
Input state:

```json
{
  "current_task": null,
  "last_completed_task": "05-refactor",
  "next_task": "06-validate",
  "selected_refactor_step": "step-03-extract-service",
  "completed_step_ids": [
    "step-01-rename-module"
  ],
  "status": "awaiting_validation",
  "artifacts_dir": ".prodify/artifacts",
  "notes": []
}
```

Resolver output:

```json
{
  "decision": "dispatch",
  "resolved_task": "06-validate",
  "reason": "validation_required_now",
  "resume_condition": "run Task 06 before any new refactor step",
  "state_requirements": []
}
```

### Example 4 - Validation Fail
Input state:

```json
{
  "current_task": null,
  "last_completed_task": "05-refactor",
  "next_task": "05-refactor",
  "selected_refactor_step": "step-03-extract-service",
  "completed_step_ids": [
    "step-01-rename-module"
  ],
  "status": "failed",
  "artifacts_dir": ".prodify/artifacts",
  "notes": [
    "Task 06 reported a regression for step-03-extract-service."
  ]
}
```

Resolver output:

```json
{
  "decision": "retry",
  "resolved_task": "05-refactor",
  "reason": "retry_failed_selected_step",
  "resume_condition": "correct the failure cause first",
  "state_requirements": [
    "selected_refactor_step must remain step-03-extract-service"
  ]
}
```

### Example 5 - Blocked Schema Drift
Input state:

```json
{
  "current_task": "01-understand",
  "last_completed_task": null,
  "next_task": "01-understand",
  "selected_refactor_step": null,
  "status": "ready",
  "artifacts_dir": ".prodify/artifacts",
  "notes": []
}
```

Resolver output:

```json
{
  "decision": "stop_blocked",
  "resolved_task": null,
  "reason": "run_state_schema_incomplete",
  "resume_condition": "add the required completed_step_ids field",
  "state_requirements": [
    "completed_step_ids"
  ]
}
```

### Example 6 - Terminal Completion
Input state:

```json
{
  "current_task": null,
  "last_completed_task": "06-validate",
  "next_task": null,
  "selected_refactor_step": null,
  "completed_step_ids": [
    "step-01-rename-module",
    "step-02-add-guard-clause",
    "step-03-extract-service"
  ],
  "status": "complete",
  "artifacts_dir": ".prodify/artifacts",
  "notes": []
}
```

Resolver output:

```json
{
  "decision": "stop_complete",
  "resolved_task": null,
  "reason": "workflow_complete",
  "resume_condition": "none",
  "state_requirements": []
}
```

## Implementation Notes

- Keep `run_state.json` authoritative; use other artifacts only for confirmation or ambiguity detection.
- Prefer blocking on incomplete schema or inconclusive validation over inventing progress.
- The resolver should be pure decision logic; it does not mutate state or rewrite artifacts.
