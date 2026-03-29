---
task_id: 06-validate
reads:
  - .agent/artifacts/architecture_spec.md
  - .agent/artifacts/refactor_plan.md
  - .agent/artifacts/implementation_summary.md
writes:
  - .agent/artifacts/validation_report.md
next_task: 05-refactor
mode: validation
---
# Task 06 — Validate: Production Readiness Audit

## Identity & Mandate
**Goal:** Rigorously audit refactored code against current production standards.  
**Role:** `@Quality-Gatekeeper`  
**Problem:** Refactoring drift and hidden regressions.

## Data Contract
**Input:** Current source files plus `architecture_spec.md` and `refactor_plan.md`  
**Output:** `validation_report.md`

## Execution Instructions (SOP)
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

## Output Specification
Use `.agent/templates/validation_report.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Definition of Done
- The refactored code has a strict readiness verdict.
- Category scores are provided.
- Remaining issues and regressions are clearly listed.
