# Rule 10 — Artifact Flow and Orchestration Rules

## Purpose
Define how outputs flow automatically between Prodify tasks.

## Artifact Location
All task artifacts live in `.prodify/artifacts/`.

## Handoff Rules
- Every task must read its declared inputs from `.prodify/artifacts/`.
- Every task must write exactly one primary output artifact declared in its frontmatter.
- Before starting a task, verify that all required input artifacts exist.
- After completing a task, validate the output structure against the matching template in `.prodify/templates/`.
- If output validation fails, do not advance workflow state.
- If an expected artifact is missing or stale, regenerate it before continuing.

## Workflow State
Use `.prodify/artifacts/run_state.json` as the source of truth for:
- current task
- last completed task
- next task
- selected refactor step
- overall status

Use `.prodify/artifacts/task_log.json` to append execution history.

## Loop Rules
- Tasks 01 through 04 are linear.
- Task 05 executes exactly one refactor step at a time unless explicitly told otherwise.
- Task 06 must run after every Task 05 execution.
- If Task 06 fails and more refactor steps remain, loop back to Task 05.
- If Task 06 passes or requested scope is complete, stop.

## Reporting Rules
Every task response must include:
1. Current task
2. Inputs
3. Output artifact
4. Code modified: yes/no
5. Next step
