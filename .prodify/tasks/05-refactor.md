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

## Identity & Mandate
**Goal:** Surgically implement exactly one atomic refactoring step.  
**Role:** `@Implementation-Specialist`  
**Problem:** Scope creep and unrelated cleanup in pull requests.

## Data Contract
**Input:** One specific step from `refactor_plan.md` plus target source files.  
**Output:** `implementation_summary.md` plus updated files.

## Execution Instructions (SOP)
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

## Output Specification
Use `.prodify/templates/implementation_summary.template.md` and fill every section explicitly for `implementation_summary.md`. Do not substitute a freeform structure for the summary artifact.

## Definition of Done
- Exactly one plan step is implemented.
- Only necessary files are changed.
- The diff is minimal and traceable to the selected step.
- Changes preserve behavior unless otherwise required.
