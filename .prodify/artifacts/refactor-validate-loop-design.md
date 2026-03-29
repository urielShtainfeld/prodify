# Refactor Validate Loop Design

Date: 2026-03-28
Scope: `./.prodify/`

## Purpose
Define the iterative execution loop that runs one refactor step through Task `05-refactor`, immediately validates it with Task `06-validate`, and decides whether to continue, retry, pause, or stop.

This loop is responsible for:
- executing exactly one selected refactor step at a time
- enforcing immediate validation after each Task `05-refactor`
- deciding loop continuation from validation outcome and remaining-step state

This loop is not responsible for:
- selecting a step without consulting the step-selection layer
- skipping validation
- advancing workflow state without successful artifact validation

## Loop Flow

### Entry Conditions
The loop may start only when:
- `next_task` is `05-refactor`
- workflow state is runnable (`ready` or a retryable `failed` state)
- a valid step-selection result exists

If no valid step-selection result exists:
- do not enter the loop
- stop in blocked or failed state depending on the cause

### Loop Sequence
1. Resolve the active step using the step-selection layer.
2. Dispatch and execute Task `05-refactor` for exactly one step.
3. Validate the Task 05 output artifact and update state to require Task `06-validate`.
4. Dispatch and execute Task `06-validate` for the same selected step.
5. Interpret the validation result.
6. Choose one of:
   - continue to the next step
   - retry the same step
   - pause/block for repair
   - stop as complete

## Decision Rules

### Rule 1 - Task 05 Must Be Followed Immediately By Task 06
After a successful Task `05-refactor` execution:
- set the loop to validation mode immediately
- do not select or execute another refactor step until Task `06-validate` finishes

### Rule 2 - Validation PASS
If Task `06-validate` passes:
- mark the selected step as completed
- ask the step-selection layer for the next step
- if another valid step exists:
  - continue the loop with `05-refactor`
- if no valid steps remain:
  - stop the loop as complete

### Rule 3 - Validation FAIL
If Task `06-validate` fails with a decisive negative result:
- do not mark the step as completed
- keep the same `selected_refactor_step`
- move the loop into retry-or-repair decision mode

Default behavior:
- retry the same step only after the failure is understood and corrected
- do not advance to a later step automatically

### Rule 4 - Validation Inconclusive
If Task `06-validate` cannot reach a trustworthy pass/fail result, treat the outcome as `inconclusive`.

Examples:
- missing validation inputs
- incomplete validation artifact
- ambiguous or partial validation output
- execution interruption during validation

Behavior:
- do not mark the step completed
- do not select the next step
- pause the loop in a blocked state
- require validation repair or rerun before continuing

### Rule 5 - No Remaining Steps
If the step-selection layer returns `no_steps_remaining` after a successful validation pass:
- stop the loop
- signal workflow completion

### Rule 6 - Unpopulated Or Malformed Plan
If the step-selection layer returns:
- `plan_unpopulated`
- `malformed_plan`
- `invalid_state`

Behavior:
- do not run Task `05-refactor`
- stop the loop immediately
- mark the workflow blocked or failed according to the selection result

## Retry Behavior

### Retry Same Step
Retry the same selected step only when:
- Task `06-validate` produced a FAIL result
- the selected step still exists in `refactor_plan.md`
- the system has not switched into a terminal stop condition

Retry rules:
- keep `selected_refactor_step` unchanged
- keep `completed_step_ids` unchanged
- set `next_task` back to `05-refactor`
- require the next cycle to target the same step

### Do Not Skip Ahead After Failure
The loop must not automatically choose the next remaining step after a failed validation result.

Reason:
- skipping ahead would hide regressions and violate the one-step-at-a-time repair discipline

## Pause And Block Behavior

### Pause Conditions
Pause the loop when:
- validation result is inconclusive
- required artifacts are missing
- the refactor plan is unpopulated or malformed
- the selected step cannot be resolved
- state contradictions are detected

### Blocked Outcome
When paused for a structural or recoverable issue:
- set workflow status to `blocked`
- leave a precise blocker note
- require correction before resuming

## Stop Behavior

### Stop As Complete
Stop the loop as complete only when:
- the current step has passed validation
- no remaining valid steps exist

### Stop As Failed
Stop the loop as failed when:
- validation fails and no safe retry can proceed
- state contradictions prevent deterministic continuation
- selection or validation returns an unrecoverable invalid-state result

### Stop Without Entering The Loop
Do not start the loop if:
- there is no selectable step
- `refactor_plan.md` is still template-only
- Task 05 cannot be dispatched safely

## Fail-Safe Behavior For Inconclusive Validation

### Inconclusive Result Handling
Treat inconclusive validation as neither PASS nor FAIL.

Required behavior:
- do not append the step to `completed_step_ids`
- do not select a next step
- do not mark the workflow complete
- do not silently downgrade to PASS
- do not silently convert to a retry unless the missing validation condition is repaired

Recommended state outcome:
- `status: blocked`
- `next_task: "06-validate"` or recovery-specific retry path
- note the exact reason in workflow notes

## Loop Decision Matrix

| Current phase | Outcome | Next loop action | State intent |
| --- | --- | --- | --- |
| Step selection | `selected` | Run `05-refactor` | runnable |
| Step selection | `plan_unpopulated` | Stop and block | blocked |
| Step selection | `malformed_plan` | Stop and fail/block | failed or blocked |
| Task 05 | output valid | Run `06-validate` immediately | awaiting validation |
| Task 05 | output invalid | Retry or fail before validation | failed |
| Task 06 | PASS | Select next remaining step or stop complete | ready or complete |
| Task 06 | FAIL | Retry same step after correction | failed |
| Task 06 | inconclusive | Pause for repair/rerun | blocked |

## Integration Notes

### Integration With Step Selection
- The loop never invents a step ID.
- It must always consult the step-selection layer before entering `05-refactor` for a new step.
- After PASS, it must consult step selection again to determine whether another step remains.

### Integration With Task 05
- Task `05-refactor` must implement exactly one selected step.
- The loop must reject any attempt to batch multiple steps in one iteration.

### Integration With Task 06
- Task `06-validate` must run immediately after each successful Task `05-refactor`.
- Validation governs whether the loop continues, retries, pauses, or stops.

### Integration With Run-State Logic
- The run-state layer updates:
  - `selected_refactor_step`
  - `completed_step_ids`
  - `next_task`
  - `status`
- The loop design defines when those updates should happen, not the low-level write mechanics.

### Integration With Dispatcher
- The dispatcher controls task dispatch sequencing.
- The loop design controls the high-level decision of whether the dispatcher should schedule `05-refactor`, `06-validate`, or stop.

## Retry/Stop Behavior Summary
- PASS:
  - complete current step
  - continue if more valid steps remain
  - otherwise stop complete
- FAIL:
  - keep same step active
  - retry only after correction
  - do not advance to a new step
- inconclusive:
  - pause/block
  - require validation repair or rerun
- invalid plan/state:
  - stop before or during loop
  - require repair before any further iteration

## Implementation Notes
- Prefer explicit state transitions over implicit loop assumptions.
- Keep refactor and validation tightly paired; do not allow a second refactor before validating the first.
- Treat inconclusive validation as a safety stop, not a soft pass.
