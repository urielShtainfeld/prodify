# Run Summary Spec

Date: 2026-03-29
Scope: `./prodify-agent/.agent/`

## Purpose

Define the short human-readable summary emitted after each Prodify run cycle.

The run summary should:

- describe what just happened
- stay shorter than the full status view
- be understandable without opening `task_log.json`

## Required Sections

The run summary must include these sections in this order:

1. `Task executed`
2. `Result`
3. `Artifact written`
4. `Code modified`
5. `Next step`

## Section Definitions

### Task Executed
Source:
- latest entry in `task_log.json.executions`

Display rule:
- show the runtime task ID that just ran
- if no task ran because the system was blocked or complete, show the task that was attempted or `none`

### Result
Source:
- latest entry in `task_log.json.executions.result`

Allowed display values:
- `success`
- `blocked`
- `failed`

Display rule:
- use the exact normalized result from the latest log entry

### Artifact Written
Source:
- latest entry in `task_log.json.executions.artifacts_touched`

Display rule:
- show the primary artifact path when one was written
- if multiple artifacts were touched, show the most important runtime artifact first and optionally note additional touched artifacts
- if none were written, show `none`

### Code Modified
Derived from the task executed.

Display rule:
- `yes` only for Task `05-refactor`
- `no` for Tasks `01` through `04` and `06`
- if no task actually ran, show `no`

### Next Step
Source:
- current runtime state and resolver decision after the run cycle

Display rule:
- show the next task if the system is runnable
- show a retry target for failed retryable states
- show a blocker summary for blocked states
- show `none` for terminal completion

## Formatting Rules

### General Style
- keep the summary short
- prefer five stable labeled lines
- avoid long explanations
- avoid dumping notes arrays directly

### Recommended Format

```text
Task executed: <task-or-none>
Result: <success|blocked|failed>
Artifact written: <artifact-path-or-none>
Code modified: <yes|no>
Next step: <next-action>
```

### Compression Rules
- if multiple artifacts were touched, show the primary artifact and optionally append `(+N more)`
- if the next step is blocked, summarize the blocker in one short clause
- if the next step is complete, show `none`

## Example Summary

### Example 1 - Successful Analysis Task

```text
Task executed: 02-diagnose
Result: success
Artifact written: .agent/artifacts/diagnostic_report.md
Code modified: no
Next step: 03-architecture
```

### Example 2 - Blocked Refactor Attempt

```text
Task executed: 05-refactor
Result: blocked
Artifact written: none
Code modified: no
Next step: unblock selected_refactor_step resolution
```

### Example 3 - Failed Validation

```text
Task executed: 06-validate
Result: failed
Artifact written: .agent/artifacts/validation_report.md
Code modified: no
Next step: retry 05-refactor for step-03-extract-service
```

## Integration Notes

### Integration With Task Log
- the summary should primarily read from the latest execution entry
- the log remains the durable execution history

### Integration With Validation Report
- validation details should not be duplicated in full
- only the latest outcome needed for the summary should be surfaced

### Integration With Status Output
- the run summary is event-oriented
- the status output is state-oriented
- do not merge them into one output format

## Implementation Notes

- Keep the output useful even when the latest run was blocked.
- Prefer one trustworthy next-step line over a detailed branching explanation.
- This summary is for each run cycle, not for the entire project history.
