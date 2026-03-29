# Status Output Spec

Date: 2026-03-29
Scope: `./.prodify/`

## Purpose

Define a concise human-readable status view for Prodify.

The status view is intended for:

- CLI output from `prodify status`
- quick operator inspection
- agent-readable summaries that do not require opening raw JSON artifacts

The status view must summarize the current run without executing work or mutating state.

## Fields Shown

The status view should show these fields in this order:

1. `Status`
2. `Current task`
3. `Next task`
4. `Current phase`
5. `Last completed task`
6. `Completed tasks`
7. `Pending tasks`
8. `Selected refactor step`
9. `Latest validation`
10. `Note`

## Field Definitions

### Status
Source:
- `run_state.json.status`

Meaning:
- the top-level runtime condition

Examples:
- `ready`
- `running`
- `awaiting_validation`
- `blocked`
- `failed`
- `complete`

### Current Task
Source:
- `run_state.json.current_task`

Display rule:
- show the active task if non-null
- otherwise show `none`

### Next Task
Source:
- `run_state.json.next_task`
- optionally confirmed by the resolver when status output is enriched by resolver logic

Display rule:
- show the next deterministic task when available
- show `none` for terminal completion
- show `blocked` or `unavailable` when state is incomplete and no trustworthy next task can be shown

### Current Phase
Derived from runtime status and task position.

Display rule:
- `ready` -> `ready to run`
- `running` -> `executing`
- `awaiting_validation` -> `validation pending`
- `blocked` -> `blocked`
- `failed` -> `retry or repair required`
- `complete` -> `complete`

This is a human-friendly phase label, not a separate stored runtime field.

### Last Completed Task
Source:
- `run_state.json.last_completed_task`

Display rule:
- show the last completed runtime task
- show `none` when no task has completed yet

### Completed Tasks
Derived from:
- `run_state.json.last_completed_task`
- `task_log.json.executions`

Display rule:
- summarize completed runtime tasks from the fixed pipeline:
  - `01-understand`
  - `02-diagnose`
  - `03-architecture`
  - `04-plan`
  - repeated `05-refactor` and `06-validate` cycles should be summarized compactly

Recommended display:
- show a short list for linear tasks already completed
- for refactor-loop work, show either:
  - completed step count, or
  - completed step IDs if the list is short

### Pending Tasks
Derived from:
- fixed runtime pipeline
- current `next_task`
- loop state
- completed-step state when available

Display rule:
- for the linear pipeline, show remaining named tasks after `last_completed_task`
- when in the refactor loop:
  - show `05-refactor -> 06-validate` as the remaining loop path
  - optionally include remaining step count if available

### Selected Refactor Step
Source:
- `run_state.json.selected_refactor_step`

Display rule:
- show the step ID when relevant
- show `none` when not in refactor-loop work

### Latest Validation
Derived from:
- `validation_report.md`
- current runtime state when validation report is incomplete

Display rule:
- show one of:
  - `PASS`
  - `FAIL`
  - `inconclusive`
  - `unknown`

Rules:
- if `validation_report.md` explicitly contains a resolved result, show it
- if the report is template-only or missing a trustworthy result, show `unknown` or `inconclusive`
- do not display `PASS` unless it is actually supported by the validation source

### Note
Source:
- first high-signal entry in `run_state.json.notes`

Display rule:
- show the most useful short note if one exists
- omit the field entirely if there is no note

## Formatting Guidelines

### General Style
- keep the output concise
- prefer one line per field
- use stable labels
- avoid prose paragraphs
- avoid dumping raw JSON

### Recommended Format

Use this compact line-oriented format:

```text
Status: <status>
Current task: <task-or-none>
Next task: <task-or-none>
Current phase: <human-phase>
Last completed task: <task-or-none>
Completed tasks: <summary>
Pending tasks: <summary>
Selected refactor step: <step-or-none>
Latest validation: <result>
Note: <short-note>
```

### Omission Rules
- omit `Selected refactor step` when no step is active and the run has not entered refactor work yet
- omit `Note` when no note exists
- keep `Completed tasks` and `Pending tasks` summarized rather than exhaustive when the output would become noisy

### Readability Rules
- prefer task IDs over verbose restatements
- keep lists comma-separated on a single line when short
- if a list grows long, compress to counts plus the most relevant item
- never print placeholder values from templates literally, such as `PASS/FAIL:`

## State-Specific Output Rules

### Ready
Show:
- current status
- next runnable task
- pending pipeline tasks

Tone:
- runnable and calm

### Running
Show:
- active current task
- next task if known
- current phase as `executing`

Tone:
- resume-oriented

### Awaiting Validation
Show:
- `Current phase: validation pending`
- `Next task: 06-validate`
- active selected refactor step

Tone:
- immediate and specific

### Blocked
Show:
- `Status: blocked`
- blocker note if present
- latest validation as `unknown` or `inconclusive` when appropriate

Tone:
- clear, not noisy

### Failed
Show:
- failed state
- retry target if one exists
- selected failed step when relevant
- failure note

Tone:
- actionable

### Complete
Show:
- terminal completion
- no next task
- completed tasks summary
- latest validation result if known

Tone:
- succinct and final

## Example Output

### Example 1 - Fresh Start

```text
Status: ready
Current task: none
Next task: 01-understand
Current phase: ready to run
Last completed task: none
Completed tasks: none
Pending tasks: 01-understand, 02-diagnose, 03-architecture, 04-plan, 05-refactor -> 06-validate
Latest validation: unknown
```

### Example 2 - Awaiting Validation

```text
Status: awaiting_validation
Current task: none
Next task: 06-validate
Current phase: validation pending
Last completed task: 05-refactor
Completed tasks: 01-understand, 02-diagnose, 03-architecture, 04-plan, 1 validated refactor step
Pending tasks: 06-validate, remaining refactor loop
Selected refactor step: step-03-extract-service
Latest validation: unknown
```

### Example 3 - Blocked State

```text
Status: blocked
Current task: none
Next task: unavailable
Current phase: blocked
Last completed task: 04-plan
Completed tasks: 01-understand, 02-diagnose, 03-architecture, 04-plan
Pending tasks: 05-refactor -> 06-validate
Latest validation: inconclusive
Note: run_state.json is missing completed_step_ids
```

### Example 4 - Failed Validation

```text
Status: failed
Current task: none
Next task: 05-refactor
Current phase: retry or repair required
Last completed task: 05-refactor
Completed tasks: 01-understand, 02-diagnose, 03-architecture, 04-plan, 2 validated refactor steps
Pending tasks: retry selected refactor step, then continue validation loop
Selected refactor step: step-03-extract-service
Latest validation: FAIL
Note: retry the selected step after correcting the regression
```

### Example 5 - Complete

```text
Status: complete
Current task: none
Next task: none
Current phase: complete
Last completed task: 06-validate
Completed tasks: 01-understand, 02-diagnose, 03-architecture, 04-plan, all planned refactor steps validated
Pending tasks: none
Latest validation: PASS
```

## Current-State Compatibility Rules

The current runtime artifacts are still partial, so status output must handle incompleteness gracefully.

### Missing `completed_step_ids`
If `run_state.json` lacks `completed_step_ids`:

- do not assume an empty list
- show status as currently recorded
- set `Next task` to `blocked` or `unavailable` if resolver logic cannot trust the state
- use `Note` to explain the schema gap

### Template-Only `validation_report.md`
If the validation report still contains placeholder template fields:

- show `Latest validation: unknown` or `Latest validation: inconclusive`
- do not claim `PASS`
- do not echo placeholder template text directly

### Empty `task_log.json`
If task history is empty:

- allow `Completed tasks: none`
- do not infer hidden task progress

## Implementation Notes

- `prodify status` should remain a summary view, not a full diagnostic dump.
- If resolver enrichment is used, it should only clarify the displayed next task; it should not expand into a full `prodify next` response.
- Prefer showing trustworthy unknowns over presenting guessed progress.
