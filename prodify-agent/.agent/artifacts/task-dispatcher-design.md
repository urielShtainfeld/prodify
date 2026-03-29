# Task Dispatcher Design

Date: 2026-03-28
Scope: `./prodify-agent/.agent/`

## Purpose
Define how the system selects, prepares, and hands off the correct task using workflow state from `run_state.json`.

The dispatcher is responsible for choosing the next executable task and assembling the verified execution context for that task. It is not responsible for:
- performing the task itself
- validating output artifacts after execution
- mutating workflow state beyond the dispatcher's own error reporting

## Required Inputs
- `.agent/artifacts/run_state.json`
  - source of truth for `current_task`, `last_completed_task`, `next_task`, `selected_refactor_step`, `completed_step_ids`, and `status`
- `.agent/tasks/*.md`
  - source of task metadata and task ordering via frontmatter
- `.agent/artifacts/`
  - source of declared input artifacts referenced in task frontmatter
- `.agent/templates/`
  - source of task output templates referenced in the selected task's output specification
- `.agent/artifacts/task-self-validation-spec.md`
  - source of pre-run validation requirements and task-specific checks
- `.agent/artifacts/run-state-design.md`
  - source of status handling, transition expectations, and resume rules
- `.agent/artifacts/task_log.json`
  - append-only execution history sink after task completion or failure

## Dispatcher Responsibilities
- read and validate workflow state before dispatch
- resolve the single task that is allowed to run next
- locate the matching task file
- load task frontmatter and execution metadata
- derive required inputs and expected primary output
- prepare the execution payload for the selected task
- stop and surface deterministic failure reasons when dispatch cannot continue

## Dispatch Algorithm

### Step 1 - Load State
1. Read `.agent/artifacts/run_state.json`.
2. Confirm the required state fields exist:
   - `current_task`
   - `last_completed_task`
   - `next_task`
   - `selected_refactor_step`
   - `completed_step_ids`
   - `status`
3. If required fields are missing or malformed, stop with dispatcher failure.

### Step 2 - Resolve Dispatch Mode From Status
Dispatch behavior depends on `status`:
- `ready`
  - dispatch `next_task`
- `running`
  - resume `current_task`
- `awaiting_validation`
  - dispatch `06-validate`
- `blocked`
  - do not dispatch; surface the blocker from `notes`
- `failed`
  - do not auto-advance; dispatch only the retry task identified by `next_task` after operator or system recovery logic resets state to runnable
- `complete`
  - do not dispatch; workflow is terminal

### Step 3 - Resolve Target Task ID
Determine the single target task ID:
- for `ready`, use `next_task`
- for `running`, use `current_task`
- for `awaiting_validation`, use `06-validate`

If the resolved target task ID is `null`, missing, or not one of:
- `01-understand`
- `02-diagnose`
- `03-architecture`
- `04-plan`
- `05-refactor`
- `06-validate`

stop with dispatcher failure.

### Step 4 - Resolve Task File
Map the task ID to its file in `.agent/tasks/`:
- `01-understand` -> `.agent/tasks/01-understand.md`
- `02-diagnose` -> `.agent/tasks/02-diagnose.md`
- `03-architecture` -> `.agent/tasks/03-architecture.md`
- `04-plan` -> `.agent/tasks/04-plan.md`
- `05-refactor` -> `.agent/tasks/05-refactor.md`
- `06-validate` -> `.agent/tasks/06-validate.md`

If the mapped file does not exist, stop with dispatcher failure.

### Step 5 - Load Task Metadata
Read the task file frontmatter and extract:
- `task_id`
- `reads`
- `writes`
- `next_task`
- `mode`

Reject dispatch if:
- frontmatter is missing
- the frontmatter `task_id` does not match the resolved target task ID
- more than one primary output is declared in `writes`
- the `next_task` value conflicts with the expected pipeline or loop behavior

### Step 6 - Derive Required Inputs
From task metadata and current state, compute the execution inputs:
- `task_file`
- `task_id`
- `mode`
- `declared_inputs` from `reads`
- `expected_output` from the single `writes` entry
- `declared_next_task` from task frontmatter
- `selected_refactor_step` from `run_state.json` when dispatching Tasks `05` or `06`
- `completed_step_ids` from `run_state.json` when dispatching Tasks `05` or `06`

For Task `05-refactor`, require:
- `selected_refactor_step` to be non-null
- the step to exist in `refactor_plan.md`

For Task `06-validate`, require:
- `selected_refactor_step` to be non-null
- `last_completed_task` to be `05-refactor` or `status` to be `awaiting_validation`

### Step 7 - Run Pre-Run Validation Hook
Call the self-validation layer using `task-self-validation-spec.md`:
- verify task file and frontmatter shape
- verify declared input artifacts exist
- verify the task's exact template exists
- verify expected output path consistency

If pre-run validation fails:
- do not dispatch execution
- return a structured failure
- leave branching to the run-state failure/update logic

### Step 8 - Emit Execution Payload
If all checks pass, emit a dispatcher result containing:
- `task_id`
- `task_file`
- `mode`
- `inputs`
- `expected_output`
- `selected_refactor_step`
- `code_modified`
  - expected `no` for Tasks `01` through `04` and `06`
  - expected `yes` only for Task `05`
- `candidate_next_task`
  - derived from frontmatter for Tasks `01` through `04`
  - forced to `06-validate` after Task `05`
  - resolved by validation result after Task `06`

## Success And Failure Branching

### Success Branching Before Execution
- If dispatch succeeds, control passes to task execution.
- The dispatcher does not advance run state on its own; the execution layer and state-update layer do that after task success or failure.

### Success Branching After Execution
The dispatcher consumes updated state on the next cycle:
- after Tasks `01` through `04`, the next dispatch should use the next linear task
- after Task `05`, the next dispatch should use `06-validate`
- after Task `06` PASS, the next dispatch should either:
  - loop to `05-refactor` for another step
  - stop if the workflow is complete
- after Task `06` FAIL, the next dispatch should not occur until state is recovered to a runnable form

## Failure Paths

### State Failures
- `run_state.json` missing
- required state fields missing
- unsupported `status`
- contradictory `current_task` and `next_task`
- `next_task` not allowed by the pipeline

Dispatcher action:
- stop
- report the invalid state condition
- recommend setting workflow state to `blocked` or `failed`

### Task Resolution Failures
- target task file missing
- frontmatter missing or malformed
- resolved `task_id` and frontmatter `task_id` do not match
- task declares zero or multiple primary outputs

Dispatcher action:
- stop
- report the exact task metadata problem

### Input Resolution Failures
- declared input artifact missing
- required template missing
- Task `05` or `06` missing `selected_refactor_step`
- `selected_refactor_step` not found in `refactor_plan.md`

Dispatcher action:
- stop
- report the exact missing path or invalid step reference

### Loop Control Failures
- Task `06` selected when Task `05` did not complete for the current step
- Task `05` selected while `status` is `awaiting_validation`
- Task ordering attempts to skip `06-validate` after Task `05`

Dispatcher action:
- stop
- report the illegal branch condition

## Integration Points

### Integration With Run-State Logic
- The dispatcher reads, but does not authoritatively define, status semantics from `run-state-design.md`.
- It must obey:
  - `ready`
  - `running`
  - `awaiting_validation`
  - `blocked`
  - `failed`
  - `complete`
- It must use `selected_refactor_step` and `completed_step_ids` only as inputs, not as inferred values.

### Integration With Self-Validation
- The dispatcher invokes the pre-run checks from `task-self-validation-spec.md` before handing a task off for execution.
- It does not perform post-run artifact validation; that belongs to the validation layer after execution.

### Integration With Task Execution
- The dispatcher provides the execution layer with one fully resolved task payload.
- The execution layer is responsible for:
  - loading task instructions
  - performing the task
  - writing the primary artifact
  - calling post-run validation

### Integration With Task Logging
- After execution concludes, append one record to `.agent/artifacts/task_log.json` including:
  - dispatched task ID
  - selected refactor step if any
  - execution outcome
  - output artifact path
  - next state summary

## Minimal Execution Payload Shape
```json
{
  "task_id": "02-diagnose",
  "task_file": ".agent/tasks/02-diagnose.md",
  "mode": "analysis",
  "inputs": [
    ".agent/artifacts/orientation_map.md"
  ],
  "expected_output": ".agent/artifacts/diagnostic_report.md",
  "selected_refactor_step": null,
  "code_modified": "no",
  "candidate_next_task": "03-architecture"
}
```

## Implementation Notes
- Keep task ID to file-path mapping explicit and deterministic.
- Prefer failing fast over trying to repair state implicitly.
- Use relative paths only.
- Keep dispatcher logic separate from artifact validation and state mutation so each layer remains testable and predictable.
