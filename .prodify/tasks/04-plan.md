---
task_id: 04-plan
reads:
  - .prodify/artifacts/02-diagnose.md
  - .prodify/artifacts/03-architecture.md
writes:
  - .prodify/artifacts/04-plan.md
next_task: 05-refactor
mode: planning
---
# Task 04 — Plan: Actionable Refactoring Strategy

## Goal
Decompose architectural shifts into atomic, testable increments.

## Scope
Turn the diagnosis and architecture outputs into a deterministic refactor plan that can be executed one step at a time without modifying source code.

## Inputs
- `.prodify/artifacts/02-diagnose.md`
- `.prodify/artifacts/03-architecture.md`

## Execution Instructions
1. **Phase sequencing**
   - Order the refactor into phases:
     1. Hygiene (rename, isolate, add safety checks)
     2. Peripheral systems (logging, notifications, integrations)
     3. Core domain restructuring
     4. Cleanup and consolidation

2. **Atomicity**
   - Each step must be small enough to execute independently.
   - Each step must leave the codebase in a buildable state.

3. **Risk weighting**
   - Assign risk weights:
     - Low = 1
     - Med = 3
     - High = 10
   - Use these to estimate effort and execution difficulty.

4. **Verification design**
   - Define a concrete validation command for every step, such as:
     - `npm test`
     - `npm run build`
     - `pytest`
     - `dotnet test`

5. **Planning discipline**
   - Prefer safe sequencing over aggressive optimization.
   - Avoid steps that combine unrelated concerns.
   - Make sure the plan can be executed one step at a time by an autonomous coding agent.
   - Every step block MUST use the exact repeated structure required by `.prodify/templates/04-plan.template.md`.
   - Every step MUST have a stable step ID and `Status: pending`.
   - MUST NOT modify source code.

## Output Specification
Use `.prodify/templates/04-plan.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Failure Conditions
- MUST STOP if `.prodify/artifacts/02-diagnose.md` is missing.
- MUST STOP if `.prodify/artifacts/03-architecture.md` is missing.
- MUST STOP if any plan step is ambiguous, combines unrelated concerns, or cannot be executed independently.
- MUST STOP if the output cannot be produced in `.prodify/templates/04-plan.template.md`.
- MUST NOT modify source code.

## Definition of Done
- The codebase has an ordered, atomic refactor plan.
- Every step is independently executable.
- Risk is assigned per step.
- Validation expectations are explicit.
