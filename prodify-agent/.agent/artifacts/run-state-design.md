# Run State Design

Date: 2026-03-28
Scope: `./prodify-agent/.agent/artifacts/run_state.json`

## Purpose
Define a deterministic workflow state model for the Prodify task pipeline.

The run state is the single control-plane record for workflow progress. It must be sufficient to:
- determine which task may run next
- determine whether execution may resume
- support the `05-refactor -> 06-validate` loop
- stop advancement when validation or ordering rules fail

The mandatory task pipeline is:
`01-understand -> 02-diagnose -> 03-architecture -> 04-plan -> 05-refactor -> 06-validate`

## State Schema

### Required Fields
- `current_task`
  - Type: string or null
  - Meaning: the task currently being executed, or the task that must be resumed if execution stopped mid-task
- `last_completed_task`
  - Type: string or null
  - Meaning: the most recent task that completed successfully and whose output artifact passed validation
- `next_task`
  - Type: string or null
  - Meaning: the only task allowed to start next if execution is not currently mid-task
- `selected_refactor_step`
  - Type: string or null
  - Meaning: the single refactor-plan step currently selected for Task 05 or the step most recently validated by Task 06
- `completed_step_ids`
  - Type: array of strings
  - Meaning: refactor-plan step IDs that have successfully completed Task 05 and passed Task 06 validation
- `status`
  - Type: string
  - Allowed values:
    - `ready`
    - `running`
    - `awaiting_validation`
    - `blocked`
    - `failed`
    - `complete`
  - Meaning:
    - `ready`: the state is valid and the `next_task` may begin
    - `running`: `current_task` is in progress and must be resumed or explicitly failed
    - `awaiting_validation`: Task 05 completed and Task 06 must run next for the selected step
    - `blocked`: execution cannot continue until missing inputs, stale artifacts, or operator intervention is resolved
    - `failed`: the current task or validation failed and execution must not advance
    - `complete`: the workflow has reached a terminal successful stop condition

### Supporting Fields
- `artifacts_dir`
  - Type: string
  - Meaning: relative path to the artifact root
  - Required value: `.agent/artifacts`
- `notes`
  - Type: array of strings
  - Meaning: concise state-local operator notes, failure reasons, or resume hints
  - Constraint: high-signal only; not a narrative log

## State Invariants
- Only one task may be active at a time.
- `last_completed_task` may advance only after the task's primary artifact exists and passes template validation.
- `next_task` must match the task pipeline unless the workflow is in the `05`/`06` loop.
- `selected_refactor_step` must be non-null only when:
  - Task 05 is running
  - Task 06 is validating the most recent Task 05 step
  - a failed or blocked `05`/`06` cycle must be resumed
- `completed_step_ids` must contain only step IDs from `refactor_plan.md`.
- A step ID may be appended to `completed_step_ids` only after Task 06 passes for that step.
- `status: complete` requires `current_task: null` and `next_task: null`.
- `status: awaiting_validation` requires `next_task: "06-validate"` and a non-null `selected_refactor_step`.

## Update Transitions

### Initial State
Use this when no task has completed yet:
- `current_task: null`
- `last_completed_task: null`
- `next_task: "01-understand"`
- `selected_refactor_step: null`
- `completed_step_ids: []`
- `status: "ready"`
- `artifacts_dir: ".agent/artifacts"`
- `notes: []`

### Task Start Rule
When a task begins:
- verify `next_task` matches the requested task
- set `current_task` to that task ID
- keep `next_task` unchanged until the task succeeds or fails
- set `status` to `running`

### Successful Completion Rules For Tasks 01 Through 04
After the task artifact is validated:
- set `last_completed_task` to the just-finished task
- set `current_task` to `null`
- set `next_task` to the declared `next_task` from the task frontmatter
- leave `selected_refactor_step` unchanged unless Task 04 explicitly selected an initial step
- leave `completed_step_ids` unchanged
- set `status` to `ready`
- clear transient failure notes from `notes`

### Task 04 Special Rule
Task 04 may optionally preselect the first refactor step:
- if a step is selected from `refactor_plan.md`, write it to `selected_refactor_step`
- if no step is selected yet, keep `selected_refactor_step: null`
- `next_task` still becomes `05-refactor`

### Successful Completion Rule For Task 05
After `implementation_summary.md` is validated:
- set `last_completed_task` to `"05-refactor"`
- set `current_task` to `null`
- set `next_task` to `"06-validate"`
- keep `selected_refactor_step` set to the step just implemented
- do not update `completed_step_ids` yet
- set `status` to `awaiting_validation`

### Successful Completion Rule For Task 06 - PASS
If validation passes for the selected step:
- set `last_completed_task` to `"06-validate"`
- set `current_task` to `null`
- append `selected_refactor_step` to `completed_step_ids` if not already present
- if more refactor steps remain:
  - set `next_task` to `"05-refactor"`
  - set `selected_refactor_step` to the next uncompleted step or `null` until explicitly chosen
  - set `status` to `ready`
- if no refactor steps remain or requested scope is complete:
  - set `next_task` to `null`
  - set `status` to `complete`

### Successful Completion Rule For Task 06 - FAIL
If validation fails and more refactor steps remain:
- set `last_completed_task` to `"05-refactor"`
- set `current_task` to `null`
- keep `selected_refactor_step` set to the failed step until a retry or replacement step is chosen
- keep `completed_step_ids` unchanged
- set `next_task` to `"05-refactor"`
- set `status` to `failed`
- add a short failure reason to `notes`

If validation fails and no steps remain:
- set `next_task` to `null`
- set `status` to `failed`
- keep `selected_refactor_step` set to the failed step

### Blocked State Rule
Use `blocked` when execution cannot start or continue because:
- a declared input artifact is missing
- a required template is missing
- the selected step cannot be resolved from `refactor_plan.md`
- task ordering is inconsistent with the current state

When blocked:
- keep `current_task` set only if execution was already in progress
- keep `next_task` unchanged
- add a precise blocker note to `notes`

### Failure Recovery Rule
To recover from `failed`:
- fix the artifact, task instruction, or selected step problem
- update `notes` with the recovery reason or clear stale failure notes
- set:
  - `next_task` to the required retry task
  - `current_task` to `null`
  - `status` to `ready`

## Resume Logic

### Resume Decision Table
- If `status` is `ready`:
  - start `next_task`
- If `status` is `running`:
  - resume `current_task`
  - do not advance to another task
- If `status` is `awaiting_validation`:
  - run `06-validate`
- If `status` is `blocked`:
  - inspect `notes`
  - resolve the blocker
  - re-run pre-run checks for `next_task` or `current_task`
- If `status` is `failed`:
  - inspect `notes`
  - retry the required task only after correcting the failure condition
- If `status` is `complete`:
  - stop; no next task exists

### Resume Safety Rules
- Never infer the next task from memory; trust `run_state.json`.
- Before resuming any task, re-verify the declared input artifacts.
- Before resuming Task 05 or Task 06, re-verify that `selected_refactor_step` exists in `refactor_plan.md`.
- If `last_completed_task` and `next_task` contradict the pipeline, set `status` to `blocked` and stop.
- If `completed_step_ids` contains a step not found in `refactor_plan.md`, set `status` to `failed` and stop.

## Examples

### Example 1 - Fresh Start
```json
{
  "current_task": null,
  "last_completed_task": null,
  "next_task": "01-understand",
  "selected_refactor_step": null,
  "completed_step_ids": [],
  "status": "ready",
  "artifacts_dir": ".agent/artifacts",
  "notes": []
}
```

### Example 2 - Mid-Pipeline After Task 03
```json
{
  "current_task": null,
  "last_completed_task": "03-architecture",
  "next_task": "04-plan",
  "selected_refactor_step": null,
  "completed_step_ids": [],
  "status": "ready",
  "artifacts_dir": ".agent/artifacts",
  "notes": []
}
```

### Example 3 - Task 05 Completed, Validation Required
```json
{
  "current_task": null,
  "last_completed_task": "05-refactor",
  "next_task": "06-validate",
  "selected_refactor_step": "step-03-extract-service",
  "completed_step_ids": [
    "step-01-rename-module",
    "step-02-add-guard-clause"
  ],
  "status": "awaiting_validation",
  "artifacts_dir": ".agent/artifacts",
  "notes": []
}
```

### Example 4 - Validation Failed, Loop Back To Task 05
```json
{
  "current_task": null,
  "last_completed_task": "05-refactor",
  "next_task": "05-refactor",
  "selected_refactor_step": "step-03-extract-service",
  "completed_step_ids": [
    "step-01-rename-module",
    "step-02-add-guard-clause"
  ],
  "status": "failed",
  "artifacts_dir": ".agent/artifacts",
  "notes": [
    "Task 06 reported a regression for step-03-extract-service; retry Task 05 after correcting the step."
  ]
}
```

### Example 5 - Workflow Complete
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
  "artifacts_dir": ".agent/artifacts",
  "notes": []
}
```

## Recommended Write Discipline
- Rewrite the full JSON object on every state change.
- Preserve key order for readability:
  1. `current_task`
  2. `last_completed_task`
  3. `next_task`
  4. `selected_refactor_step`
  5. `completed_step_ids`
  6. `status`
  7. `artifacts_dir`
  8. `notes`
- Keep values explicit; prefer `null` over omitted fields.
