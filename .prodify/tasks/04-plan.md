---
task_id: 04-plan
reads:
  - .prodify/artifacts/diagnostic_report.md
  - .prodify/artifacts/architecture_spec.md
writes:
  - .prodify/artifacts/refactor_plan.md
next_task: 05-refactor
mode: planning
---
# Task 04 — Plan: Actionable Refactoring Strategy

## Identity & Mandate
**Goal:** Decompose architectural shifts into atomic, testable increments.  
**Role:** `@DevOps-Planner`  
**Problem:** Big Bang refactors that break the CI pipeline.

## Data Contract
**Input:** `diagnostic_report.md` plus `architecture_spec.md`  
**Output:** `refactor_plan.md`

## Execution Instructions (SOP)
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

## Output Specification
Use `.prodify/templates/refactor_plan.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Definition of Done
- The codebase has an ordered, atomic refactor plan.
- Every step is independently executable.
- Risk is assigned per step.
- Validation expectations are explicit.
