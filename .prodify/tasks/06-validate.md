---
task_id: 06-validate
reads:
  - .prodify/artifacts/03-architecture.md
  - .prodify/artifacts/04-plan.md
  - .prodify/artifacts/05-refactor.md
writes:
  - .prodify/artifacts/06-validate.md
next_task: 05-refactor
mode: validation
---
# Task 06 — Validate: Production Readiness Audit

## Goal
Rigorously audit the refactored code against the declared architecture and plan.

## Scope
Validate the most recently executed refactor step using the current source files and the required runtime artifacts, without modifying source code.

## Inputs
- `.prodify/artifacts/03-architecture.md`
- `.prodify/artifacts/04-plan.md`
- `.prodify/artifacts/05-refactor.md`
- current source files affected by the selected step

## Execution Instructions
1. **Architectural check**
   - Verify adherence to the layer boundaries defined in Task 03.
   - Call out every remaining boundary violation.

2. **Dependency audit**
   - Run or simulate cycle detection to confirm zero circular dependencies remain where applicable.
   - Highlight any regressions.

3. **Quality scoring**
   - Grade the system from `0-100` across:
     - Architecture
     - Maintainability
     - Reliability
     - Testability

4. **Regression check**
   - Identify any new issues introduced after refactoring that were not present in the original Task 02 results.

5. **Validation discipline**
   - Be strict.
   - Prefer evidence-based failure over optimistic passing.
   - Recommend rerunning earlier steps when the result is not production ready.
   - MUST run after Task 05 for the same selected step.
   - MUST explicitly report PASS or FAIL.
   - MUST NOT modify source code.

## Output Specification
Use `.prodify/templates/06-validate.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Failure Conditions
- MUST STOP if `.prodify/artifacts/03-architecture.md` is missing.
- MUST STOP if `.prodify/artifacts/04-plan.md` is missing.
- MUST STOP if `.prodify/artifacts/05-refactor.md` is missing.
- MUST STOP if Task 05 context for the selected step is missing or ambiguous.
- MUST STOP if a PASS or FAIL verdict cannot be supported by evidence.
- MUST STOP if the output cannot be produced in `.prodify/templates/06-validate.template.md`.
- MUST NOT modify source code.

## Definition of Done
- The refactored code has a strict readiness verdict.
- Category scores are provided.
- Remaining issues and regressions are clearly listed.
- The report explicitly states PASS or FAIL.
