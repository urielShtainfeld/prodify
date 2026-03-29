# Rule 06 — Refactor Rules

## Purpose
Control code modification behavior during implementation.

## Rules
- Only Task 05 may modify source files.
- Execute exactly one plan step at a time unless explicitly told otherwise.
- Modify only necessary files.
- Preserve public behavior unless the selected step explicitly requires a contract change.
- Follow the project's existing naming and style conventions unless the plan step is specifically about normalization.
- Prefer surgical edits over broad rewrites.
- Avoid opportunistic cleanup unrelated to the selected step.
- If scope expansion becomes necessary, document why before changing additional files.

## Diff Policy
A good refactor diff is:
- minimal
- traceable
- justified by the selected plan step
