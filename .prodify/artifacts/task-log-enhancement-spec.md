# Task Log Enhancement Spec

Date: 2026-03-29
Scope: `./.prodify/artifacts/task_log.json`

## Purpose

Define a richer append-only execution log format for Prodify.

The enhanced log should:

- remain easy to inspect manually
- provide enough detail for status and summary features
- preserve deterministic append-only behavior

## Updated Log Shape

Keep the top-level container as:

```json
{
  "executions": []
}
```

Each entry in `executions` should use this shape:

```json
{
  "timestamp": "2026-03-29T10:15:00Z",
  "task": "02-diagnose",
  "result": "success",
  "artifacts_touched": [
    ".prodify/artifacts/diagnostic_report.md"
  ],
  "notes": [
    "Validated declared inputs before execution.",
    "Wrote the diagnostic report template output."
  ]
}
```

## Entry Fields

### `timestamp`
Type:
- string

Format:
- ISO 8601 UTC timestamp

Purpose:
- records when the execution result was appended

Example:
- `2026-03-29T10:15:00Z`

### `task`
Type:
- string

Purpose:
- records the runtime task ID that was executed or attempted

Allowed examples:
- `01-understand`
- `02-diagnose`
- `03-architecture`
- `04-plan`
- `05-refactor`
- `06-validate`

### `result`
Type:
- string

Allowed values:
- `success`
- `blocked`
- `failed`

Purpose:
- captures the final outcome of that execution attempt

Rules:
- use `success` only when the task completed and its primary artifact passed required validation
- use `blocked` when execution could not continue because inputs, state, or templates were incomplete
- use `failed` when the task ran or attempted to run but ended in a failure condition

### `artifacts_touched`
Type:
- array of strings

Purpose:
- records the runtime artifact paths written or materially updated during the task attempt

Rules:
- use relative paths only
- keep the list limited to artifacts materially touched by that execution result
- for blocked outcomes with no writes, this may be `[]`

Examples:
- `.prodify/artifacts/orientation_map.md`
- `.prodify/artifacts/validation_report.md`
- `.prodify/artifacts/run_state.json`

### `notes`
Type:
- array of strings

Purpose:
- captures short high-signal details about what happened

Rules:
- keep entries concise
- prefer factual statements over narrative prose
- include failure or blocker reason when relevant
- avoid duplicating full artifact contents

## Append Rules

### Rule 1 - Append Only
Never rewrite or delete earlier execution entries during normal operation.

Allowed action:
- append exactly one new entry for each completed execution attempt

### Rule 2 - One Entry Per Attempt
Each task attempt should produce at most one appended log entry.

This includes:
- successful task completion
- blocked attempt
- failed attempt

### Rule 3 - Append After Outcome Is Known
Append only after the task outcome is determined.

That means:
- after artifact validation for success
- after blocker detection for blocked outcomes
- after failure handling decides the attempt failed

### Rule 4 - Keep Order Chronological
New entries must be appended at the end of the `executions` array in actual execution order.

### Rule 5 - Preserve Prior Entries
State repair, retries, and later successful executions must not erase earlier blocked or failed entries.

### Rule 6 - Relative Paths Only
Artifact paths in `artifacts_touched` must remain relative to the runtime root.

## Result-Specific Rules

### Success Entry
A success entry should:

- include the executed task
- include the primary artifact written
- include relevant state or summary artifacts if they were updated as part of the same execution cycle
- include a short note confirming successful completion

### Blocked Entry
A blocked entry should:

- include the task that could not proceed
- include `artifacts_touched: []` when nothing was written
- include a note naming the blocker

### Failed Entry
A failed entry should:

- include the task that failed
- include any artifact written before failure if it materially exists
- include a short failure reason in `notes`

## Sample Entries

### Sample 1 - Success

```json
{
  "timestamp": "2026-03-29T10:15:00Z",
  "task": "03-architecture",
  "result": "success",
  "artifacts_touched": [
    ".prodify/artifacts/architecture_spec.md",
    ".prodify/artifacts/run_state.json"
  ],
  "notes": [
    "Architecture spec written and validated.",
    "Run state advanced to 04-plan."
  ]
}
```

### Sample 2 - Blocked

```json
{
  "timestamp": "2026-03-29T10:22:00Z",
  "task": "05-refactor",
  "result": "blocked",
  "artifacts_touched": [],
  "notes": [
    "selected_refactor_step could not be resolved from refactor_plan.md."
  ]
}
```

### Sample 3 - Failed

```json
{
  "timestamp": "2026-03-29T10:28:00Z",
  "task": "06-validate",
  "result": "failed",
  "artifacts_touched": [
    ".prodify/artifacts/validation_report.md",
    ".prodify/artifacts/run_state.json"
  ],
  "notes": [
    "Validation reported a regression for step-03-extract-service.",
    "Retry of 05-refactor is required."
  ]
}
```

## Inspection Guidelines

The log should stay easy to inspect by humans.

Guidelines:

- keep field names stable
- keep entries shallow
- avoid nested diagnostic blobs
- store only short note strings
- prefer explicit results over inferred meaning

## Integration Notes

### Integration With Run State
- `task_log.json` is not the control plane.
- `run_state.json` remains the canonical source of workflow state.
- the log exists to record execution history, not to replace state

### Integration With Status Output
- status views may use the latest execution entry to enrich human summaries
- status must still prefer current state over stale history

### Integration With Run Summary
- Task `62-add-summary-output` should be able to read the latest log entry directly
- the fields in this spec are intentionally chosen to support:
  - task executed
  - result
  - artifact written or touched
  - notes

## Implementation Notes

- Keep the existing top-level `executions` array for compatibility.
- Prefer a small stable schema over a verbose event stream.
- If no artifact was touched, use an empty array rather than inventing a placeholder path.
