# Rule 01 — Global Operating Rules

## Purpose
Define the baseline behavior for every Prodify task.

## Rules
- Always follow the task sequence defined in `AGENTS.md` unless the user explicitly requests a single task.
- Treat previous task artifacts as source of truth unless repository changes invalidate them.
- Prefer evidence-based conclusions over assumptions.
- Be conservative when repository intent is unclear.
- Never widen scope silently.
- Always state uncertainty explicitly.
- Prefer minimal, reversible changes.

## Required Behavior
For every task execution, explicitly report:
- current task
- inputs used
- output artifact produced
- whether source code was modified
- next recommended step
