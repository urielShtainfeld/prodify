---
task_id: 05-refactor
reads:
  - .prodify/artifacts/refactor_plan.md
writes:
  - .prodify/artifacts/implementation_summary.md
next_task: 06-validate
mode: execution
---
# Task 05 — Refactor: Controlled Step Execution

## Goal
Surgically implement exactly one atomic refactoring step.

## Scope
Execute one selected step from `refactor_plan.md`, update only the necessary source files for that step, and summarize the exact implementation result.

## Inputs
- `.prodify/artifacts/refactor_plan.md`
- one selected step from the fixed step structure
- the target source files named by that selected step

## Execution Instructions
1. **Isolation**
   - Read only the files specified by the selected plan step, unless a dependency is strictly required.
   - Do not widen scope without documenting why.

2. **Behavior preservation**
   - Improve structure without changing external API behavior unless the selected step explicitly requires it.
   - Preserve public contracts, side effects, and expected execution flow.

3. **Standard compliance**
   - Follow naming conventions, error handling style, and code organization patterns discovered in Task 01.
   - Prefer consistency with the project over personal preference.

4. **Diff minimization**
   - Prefer surgical block updates over whole-file rewrites.
   - Avoid opportunistic cleanup unrelated to the selected step.

5. **Execution discipline**
   - Implement one plan step only.
   - Summarize exactly what changed and why.
   - MUST execute exactly one selected refactor step.
   - MUST NOT modify unrelated files.
   - MUST STOP if the selected step is ambiguous, missing, malformed, or combines unrelated concerns.

## Output Specification
Use `.prodify/templates/implementation_summary.template.md` and fill every section explicitly for `implementation_summary.md`. Do not substitute a freeform structure for the summary artifact.

## Failure Conditions
- MUST STOP if `.prodify/artifacts/refactor_plan.md` is missing.
- MUST STOP if no single selected step can be resolved safely from the plan.
- MUST STOP if execution would require widening scope to unrelated files.
- MUST STOP if the output cannot be produced in `.prodify/templates/implementation_summary.template.md`.
- MUST NOT modify unrelated files.

## Definition of Done
- Exactly one plan step is implemented.
- Only necessary files are changed.
- The diff is minimal and traceable to the selected step.
- Changes preserve behavior unless otherwise required.
