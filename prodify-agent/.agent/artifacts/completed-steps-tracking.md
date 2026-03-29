# Completed Steps Tracking

Date: 2026-03-28
Scope: `./prodify-agent/.agent/artifacts/run_state.json`

## Purpose
Define how completed refactor steps are recorded, reused, protected from duplicate execution, and safely overridden when recovery is necessary.

## Storage Model

### Canonical Store
Use `completed_step_ids` in `.agent/artifacts/run_state.json` as the canonical source of truth for completed refactor steps.

Field shape:
```json
{
  "completed_step_ids": [
    "step-01-rename-module",
    "step-02-add-guard-clause"
  ]
}
```

### Meaning
- Each entry represents one refactor-plan step that:
  - was executed by Task `05-refactor`
  - was validated successfully by Task `06-validate`
- A step is not complete merely because Task `05-refactor` ran.
- A step becomes complete only after validation PASS.

### Scope Constraint
- `completed_step_ids` applies only to steps parsed from `refactor_plan.md`.
- IDs not present in the current parsed plan are invalid and must trigger state repair.

## Update Rules

### Add Rule
Append a step ID to `completed_step_ids` only when all of the following are true:
- `selected_refactor_step` is non-null
- Task `06-validate` completed with PASS for that step
- the step exists in the current parsed `refactor_plan.md`
- the step ID is not already present in `completed_step_ids`

### Do Not Add Rule
Do not append the step ID when:
- Task `05-refactor` finished but Task `06-validate` has not run yet
- Task `06-validate` failed
- Task `06-validate` was inconclusive
- the selected step is missing from the plan
- the plan is malformed or unpopulated

### Remove Rule
Remove a step ID only through an explicit manual override or state-repair action.

Automatic execution must not silently remove completed steps.

### Reconciliation Rule
On every step-selection or resume pass:
- compare `completed_step_ids` against the current parsed plan
- if any completed ID is absent from the plan:
  - stop execution
  - mark the state invalid or failed
  - require reconciliation before continuing

## Duplicate Prevention

### Storage-Level Prevention
- `completed_step_ids` must behave as a set, even though it is stored as an ordered array.
- The same step ID must not appear more than once.

### Execution-Level Prevention
Before selecting or dispatching a step:
- exclude every ID already present in `completed_step_ids`
- do not re-run a step that is already marked complete unless a manual override explicitly removed it from the completed list

### Append Guard
Before appending a step on validation PASS:
- check whether the step ID already exists in `completed_step_ids`
- if it already exists:
  - do not append it again
  - treat the situation as a stale-state warning rather than creating a duplicate

### Order Rule
- Preserve completion order in the array for traceability.
- Duplicate prevention takes priority over preserving attempted append order.

## Override Behavior

### Override Types
Supported manual overrides:
1. **Remove one completed step**
   - used when a previously completed step must be rerun
2. **Reset all completed steps**
   - used when the loop must restart from the beginning
3. **Add a completed step manually**
   - allowed only for explicit recovery/migration scenarios, never as the normal execution path

### Override Requirements
Every override must:
- be explicit and operator-driven
- name the exact step IDs affected
- leave a high-signal note in `run_state.json`
- trigger a consistency check against the current parsed plan

### Safe Remove Override
When removing a completed step:
- remove the step ID from `completed_step_ids`
- clear or reset `selected_refactor_step` if it points to an inconsistent step
- set `next_task` to `05-refactor`
- set `status` to `ready` or `blocked` depending on whether more repair is needed

### Safe Reset Override
When resetting all completed steps:
- set `completed_step_ids` to `[]`
- set `selected_refactor_step` to `null`
- set `next_task` to `05-refactor` only if a valid step can be reselected
- otherwise block until planning/state repair is complete

### Manual Add Override
Manual addition is the riskiest override and should be rare.

Allowed only when:
- the operator is reconciling known-good historical state
- the step exists in the current parsed plan
- a note explains why the system is trusting this completion without the current loop replay

After a manual add:
- re-run consistency checks
- ensure the step selector excludes the step

## Override Safety Rules
- Overrides must never create duplicates.
- Overrides must never reference step IDs absent from the current plan.
- Overrides must never silently skip required validation for new work.
- After any override, the system must re-evaluate:
  - `selected_refactor_step`
  - `completed_step_ids`
  - `next_task`
  - `status`

## Reuse Rules

### Normal Reuse
Completed steps are reused by exclusion:
- the step-selection layer subtracts `completed_step_ids` from the parsed plan steps
- only remaining steps are considered selectable

### Loop Reuse
After Task `06-validate` PASS:
- append the just-validated step
- select the next remaining step if any exist
- stop complete if none remain

### Resume Reuse
On resume:
- trust `completed_step_ids` only after verifying all IDs still exist in the current plan
- if verification fails, block execution until repaired

## Invalid States

### Invalid Completed-Step States
The following states are invalid:
- duplicate step IDs in `completed_step_ids`
- a completed step ID not present in `refactor_plan.md`
- a completed step ID that is also the active `selected_refactor_step` for retry
- marking a step complete before validation PASS

### Invalid-State Behavior
If any invalid state is detected:
- stop execution
- set the workflow to `failed` or `blocked`
- record a precise repair note
- require reconciliation before the next step may be selected

## Integration Notes

### Integration With Run-State Logic
- `completed_step_ids` lives in `run_state.json`.
- The run-state layer owns the actual write/update mechanics.
- This document defines when updates are valid.

### Integration With Step Selection
- Step selection must exclude completed IDs from candidate selection.
- If completed IDs contradict the parsed plan, step selection must stop.

### Integration With Refactor/Validate Loop
- The refactor/validate loop may add a step only after validation PASS.
- FAIL or inconclusive validation must leave `completed_step_ids` unchanged.

## Suggested Consistency Check
Before dispatching or resuming Task `05-refactor`:
1. Parse valid step IDs from `refactor_plan.md`.
2. Confirm `completed_step_ids` contains unique values only.
3. Confirm every completed ID exists in the parsed plan.
4. Confirm `selected_refactor_step` is not simultaneously treated as completed unless state repair explicitly requires it.
5. Stop on any inconsistency.

## Implementation Notes
- Treat `completed_step_ids` as append-only during normal successful execution.
- Reserve deletions for explicit override or reconciliation flows.
- Prefer blocking on ambiguous state over guessing which steps are complete.
