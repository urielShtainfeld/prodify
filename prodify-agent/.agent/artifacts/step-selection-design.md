# Step Selection Design

Date: 2026-03-28
Scope: `./prodify-agent/.agent/artifacts/refactor_plan.md`

## Purpose
Define how the system selects the next refactor step automatically for Task `05-refactor`.

The step selector is responsible for:
- parsing candidate step IDs from `refactor_plan.md`
- comparing those step IDs against workflow state
- selecting the next safe executable step
- deciding when the loop should stop because no valid remaining steps exist

The step selector is not responsible for:
- executing Task `05-refactor`
- validating the resulting artifact after Task `05-refactor`
- mutating workflow state directly

## Selection Logic

### Inputs
- `.agent/artifacts/refactor_plan.md`
- `.agent/artifacts/run_state.json`

Required state fields:
- `selected_refactor_step`
- `completed_step_ids`
- `status`
- `next_task`
- `last_completed_task`

### Selection Priority
Select the next step using this priority order:

1. **Existing runnable selected step**
   - If `selected_refactor_step` is non-null
   - and that step exists in `refactor_plan.md`
   - and that step is not already in `completed_step_ids`
   - then keep it as the selected step

2. **Retry after failed validation**
   - If `status` is `failed`
   - and `next_task` is `05-refactor`
   - and `selected_refactor_step` still exists in the plan
   - retry the same selected step unless operator logic explicitly replaces it

3. **First remaining step in plan order**
   - Parse steps from `refactor_plan.md` in document order
   - remove all step IDs already present in `completed_step_ids`
   - choose the first remaining valid step

4. **No selectable step**
   - If no valid uncompleted step remains, return stop/no-step-selected

### Safe-Step Rule
The next safe step is the first valid, uncompleted step in the declared order of `refactor_plan.md`.

The selector does not reorder steps by risk, file count, or complexity unless `refactor_plan.md` itself changes the order. Safety comes from honoring the planned order rather than inventing a new one.

## Parsing Assumptions

### Primary Format Assumption
The selector parses step blocks from the `## Steps` section of `refactor_plan.md`.

Each step block must begin with:
```md
### Step ID:
```

And should be followed by the standard fields:
- `Description:`
- `Files:`
- `Risk:`
- `Expected outcome:`
- `Validation command:`

### Step ID Extraction Rule
Treat the first non-empty value associated with `### Step ID:` as the canonical step ID.

Acceptable parsed examples:
- `### Step ID: step-01-rename-module`
- `### Step ID:` followed by `- step-01-rename-module`

### Plan Completeness Assumption
A plan is considered populated only if at least one step block yields a non-placeholder step ID.

Placeholder values that must not count as real step IDs:
- `Step ID`
- `step-id`
- `TBD`
- empty value

### Ordering Rule
Step order is the document order of parsed step blocks under `## Steps`.

## Parsing Outcomes

### Valid Parsed Plan
A parsed plan is valid when:
- `## Steps` exists
- at least one step block is present
- every parsed step block has a non-placeholder step ID
- step IDs are unique

### Unpopulated Template Plan
A plan is considered unpopulated when:
- `## Steps` exists but only template placeholder content is present
- or no real step IDs can be extracted

This is not the same as "no steps remain." It means planning is incomplete and step selection must stop in a blocked state.

### Malformed Plan
A plan is malformed when:
- `## Steps` is missing
- a step block exists without a parseable ID
- duplicate step IDs are present
- step structure is broken enough that deterministic selection is impossible

Malformed plans must fail selection rather than silently guessing.

## Comparison With Run State

### Completed Vs Remaining Steps
- `completed_step_ids` are authoritative for steps that already passed validation.
- Parsed plan step IDs minus `completed_step_ids` yields the remaining candidate steps.

### Selected Step Consistency
- If `selected_refactor_step` exists and is already in `completed_step_ids`, it is stale and must be cleared or ignored by the selector.
- If `selected_refactor_step` is missing from the current plan, selection must stop with an invalid-state result.

### Loop-State Expectations
- During `awaiting_validation`, no new step should be selected; the existing `selected_refactor_step` remains active for Task `06-validate`.
- During `ready` with `next_task: "05-refactor"`, the selector may choose the next step.
- During `failed` with `next_task: "05-refactor"`, the selector should preserve the failed step if it is still valid.

## Edge Cases

### Edge Case 1 - Template-Only Refactor Plan
Condition:
- `refactor_plan.md` still contains placeholder template content and no real step IDs

Behavior:
- do not select a step
- return `plan_unpopulated`
- recommend blocking Task `05-refactor` until Task `04-plan` produces a real step list

This is the canonical `template-only refactor plan` case.

### Edge Case 2 - Duplicate Step IDs
Condition:
- two or more step blocks share the same parsed step ID

Behavior:
- fail selection
- return `duplicate_step_id`
- require plan correction before continuing

### Edge Case 3 - Missing Selected Step
Condition:
- `selected_refactor_step` is set in `run_state.json` but no matching step exists in `refactor_plan.md`

Behavior:
- fail selection
- return `selected_step_missing`
- require state repair or plan repair before continuing

### Edge Case 4 - All Steps Completed
Condition:
- every parsed step ID appears in `completed_step_ids`

Behavior:
- do not select a new step
- return `no_steps_remaining`
- signal that the refactor loop may stop after validation logic confirms completion

### Edge Case 5 - Completed Step IDs Not In Plan
Condition:
- `completed_step_ids` contains one or more IDs absent from the current plan

Behavior:
- fail selection
- return `completed_step_not_in_plan`
- require state repair before continuing

### Edge Case 6 - Failed Step Retry
Condition:
- `status` is `failed`
- `next_task` is `05-refactor`
- `selected_refactor_step` still exists in the plan and is not completed

Behavior:
- keep the same selected step
- do not advance to a later step automatically

## Stop Conditions

### Stop Condition 1 - Plan Unpopulated
- no real steps can be parsed from `refactor_plan.md`
- result: stop selection and block execution

### Stop Condition 2 - Plan Malformed
- parsing cannot produce a deterministic ordered step list
- result: stop selection and fail/ block execution

### Stop Condition 3 - No Steps Remaining
- every valid parsed step has already been completed
- result: stop selection and signal loop completion

### Stop Condition 4 - Invalid State
- `selected_refactor_step` or `completed_step_ids` contradict the current plan
- result: stop selection and require state correction

## Suggested Selection Result Shape
```json
{
  "status": "selected",
  "selected_step_id": "step-01-rename-module",
  "remaining_step_ids": [
    "step-01-rename-module",
    "step-02-add-guard-clause"
  ],
  "reason": "first_remaining_step"
}
```

Possible `status` values:
- `selected`
- `no_steps_remaining`
- `plan_unpopulated`
- `malformed_plan`
- `invalid_state`

## Integration Notes

### Integration With Run-State Logic
- The selector reads `selected_refactor_step`, `completed_step_ids`, `status`, and `next_task`.
- The run-state updater decides how the selection result changes `run_state.json`.

### Integration With Dispatcher
- The dispatcher should invoke step selection before dispatching Task `05-refactor` when `selected_refactor_step` is null or needs validation.
- The dispatcher should not choose a step by itself if the step selector returns a stop condition.

### Integration With Task 06 Loop
- Step selection runs only when the workflow is returning to `05-refactor`.
- It must not choose a new step while `06-validate` is still pending for the current one.

## Implementation Notes
- Parse only the `## Steps` section to avoid accidentally treating summary text as steps.
- Prefer explicit failure over heuristics when step structure is ambiguous.
- Preserve document order; do not sort step IDs independently of the plan.
