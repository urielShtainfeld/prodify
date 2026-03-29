# CLI Command Design

Date: 2026-03-29
Scope: `./.prodify/`

## Purpose

Define the operator-facing CLI surface for running, advancing, and inspecting Prodify.

This command set must:

- use the runtime state and resolver design as the control source
- expose a minimal, understandable interface
- separate state-changing commands from read-only commands

## Command List

The initial CLI surface contains exactly three commands:

- `prodify run`
- `prodify next`
- `prodify status`

## Shared Inputs

All three commands may read:

- `.prodify/artifacts/run_state.json`
- `.prodify/artifacts/task_log.json`
- `.prodify/artifacts/validation_report.md`

Supporting design references:

- `.prodify/artifacts/run-state-design.md`
- `.prodify/artifacts/next-step-resolver-design.md`

## Command Boundaries

### `prodify run`
- mutates workflow state by executing work
- may write runtime artifacts and update task history
- uses the resolver to decide what to execute now

### `prodify next`
- does not execute work
- does not mutate workflow state
- shows the resolver's current next-step decision

### `prodify status`
- does not execute work
- does not mutate workflow state
- shows a concise human-readable snapshot of progress

## Command Behavior

### `prodify run`

#### Goal
Execute the next allowed unit of work from the current runtime state.

#### Inputs
- required:
  - `.prodify/artifacts/run_state.json`
- optional but normally present:
  - `.prodify/artifacts/task_log.json`
  - `.prodify/artifacts/validation_report.md`
  - runtime task files under `.prodify/tasks/`
  - runtime templates under `.prodify/templates/`

#### Behavior
1. Load and validate `run_state.json`.
2. Invoke the next-step resolver.
3. If the resolver returns:
   - `dispatch`:
     - dispatch the resolved task
   - `resume`:
     - resume the interrupted task
   - `retry`:
     - rerun the required retry task only
   - `stop_blocked`:
     - stop without mutation and print the blocker
   - `stop_failed`:
     - stop without mutation and print the failure
   - `stop_complete`:
     - stop without mutation and print completion
4. If a task runs:
   - perform pre-run validation
   - execute the task
   - validate the output artifact
   - update `run_state.json`
   - append to `task_log.json`
5. Exit after one deterministic run cycle.

#### Output
Machine-oriented summary plus concise human feedback:

- resolved decision
- task executed or resumed, if any
- artifact written, if any
- state result
- next recommended action

#### Mutation Rule
`prodify run` is the only command in this initial CLI surface that may advance workflow state.

### `prodify next`

#### Goal
Show what Prodify would do next if asked to run now.

#### Inputs
- `.prodify/artifacts/run_state.json`
- `.prodify/artifacts/task_log.json`
- `.prodify/artifacts/validation_report.md`

#### Behavior
1. Load runtime state.
2. Invoke the next-step resolver in read-only mode.
3. Return the resolver decision without executing any task.

#### Output
Return:

- decision
- resolved task or stop outcome
- reason
- resume condition
- required repair items if blocked or failed

#### Mutation Rule
`prodify next` must not change:

- `run_state.json`
- `task_log.json`
- any artifact

### `prodify status`

#### Goal
Show a concise operator summary of current workflow progress.

#### Inputs
- `.prodify/artifacts/run_state.json`
- `.prodify/artifacts/task_log.json`
- `.prodify/artifacts/validation_report.md`

#### Behavior
1. Read current runtime state.
2. Summarize current progress and latest known validation posture.
3. Optionally call the resolver to enrich status with the current next-step decision.
4. Print a concise human-readable view.

#### Output
Must include at minimum:

- current status
- current task or next task
- last completed task
- selected refactor step, if any
- completed step count or IDs when relevant
- latest validation posture

Detailed formatting is deferred to Task `52-add-status-output`.

#### Mutation Rule
`prodify status` is strictly read-only.

## Mapping To Workflow State

| State condition | `prodify run` | `prodify next` | `prodify status` |
| --- | --- | --- | --- |
| `ready` with valid `next_task` | execute the resolved task | show the task to be run | show runnable state and upcoming task |
| `running` with valid `current_task` | resume current task | show resume target | show interrupted task and resumable state |
| `awaiting_validation` | execute `06-validate` | show validation-required next step | show validation pending |
| `blocked` | stop and print blocker | show blocked decision | show blocker notes |
| `failed` with retryable target | retry only the required task | show retry target | show failed state and retry context |
| `complete` | stop and print completion | show complete stop | show completed run |

## State-Specific Command Notes

### Ready
- `run` should advance one step.
- `next` should expose the exact resolver choice.
- `status` should communicate that the system is runnable.

### Running
- `run` should resume, not skip ahead.
- `next` should report `resume`.
- `status` should show the interrupted task clearly.

### Awaiting Validation
- `run` must execute `06-validate` immediately.
- `next` must not suggest `05-refactor`.
- `status` should make validation urgency visible.

### Blocked
- `run` must not guess or auto-repair.
- `next` should report the blocker and repair condition.
- `status` should surface the blocker note plainly.

### Failed
- `run` should only retry the deterministic retry target after failure conditions are corrected.
- `next` should expose whether retry is possible or state reconciliation is needed.
- `status` should show the failed step or task and the failure note.

### Complete
- `run` should exit cleanly without further work.
- `next` should return a stop-complete decision.
- `status` should show terminal completion.

## Current-State Compatibility Rules

The current repo still contains partial runtime artifacts. The CLI design must account for that.

### Missing `completed_step_ids`
If `run_state.json` is missing required resolver fields:

- `run` must stop blocked
- `next` must report schema incompleteness
- `status` must show that state is incomplete rather than pretending the run is healthy

### Template-Only `validation_report.md`
If the validation report is still placeholder-shaped:

- `run` must treat validation-dependent decisions as blocked or inconclusive when resolver rules require it
- `next` must report `validation_inconclusive`
- `status` should show latest validation as unknown or inconclusive, not PASS

## Example Command Outputs

### Example 1 - `prodify next`
Input condition:
- `status: ready`
- `next_task: "04-plan"`

Example output:

```text
decision: dispatch
resolved_task: 04-plan
reason: linear_pipeline_ready
resume_condition: state already runnable
```

### Example 2 - `prodify run`
Input condition:
- `status: awaiting_validation`
- `next_task: "06-validate"`

Example output:

```text
decision: dispatch
executed_task: 06-validate
artifact_written: .prodify/artifacts/validation_report.md
state_result: ready
next_action: evaluate remaining refactor steps
```

### Example 3 - `prodify status`
Input condition:
- `status: failed`
- `next_task: "05-refactor"`
- `selected_refactor_step: "step-03-extract-service"`

Example output:

```text
Status: failed
Current task: none
Next task: 05-refactor
Last completed task: 05-refactor
Selected refactor step: step-03-extract-service
Latest validation: FAIL
Note: retry the selected step after correcting the regression
```

## Minimal Interface Contract

### `prodify run`
- input: current runtime artifacts
- output: one execution-cycle result
- side effects: yes

### `prodify next`
- input: current runtime artifacts
- output: one resolver decision
- side effects: no

### `prodify status`
- input: current runtime artifacts
- output: one concise status summary
- side effects: no

## Implementation Notes

- Keep the first CLI version narrow and deterministic.
- Route all execution intent through the resolver instead of duplicating branching logic inside commands.
- Let Task `52-add-status-output` refine formatting, while this task defines command semantics and command/state boundaries.
