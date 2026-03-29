# Task Protocol Hardening Plan

Date: 2026-03-29
Task: `82-tighten-task-protocols`

## Plan

| Task file | Missing protocol elements | Exact wording to add or tighten | Severity |
| --- | --- | --- | --- |
| `01-understand.md` | explicit required inputs section, explicit no-code-modification rule, explicit failure conditions | Add `## Inputs` for repository root; add `MUST NOT modify source code`; add stop conditions for missing repository access, missing output-template compliance, or unsupported scan evidence. | High |
| `02-diagnose.md` | explicit failure conditions, explicit no-code-modification rule, explicit stop conditions | Add `MUST NOT modify source code`; add stop conditions for missing `orientation_map.md`, missing required context, or inability to produce the declared template output. | High |
| `03-architecture.md` | explicit failure conditions, explicit no-code-modification rule, explicit stop conditions | Add `MUST NOT modify source code`; add stop conditions for missing `orientation_map.md` or `diagnostic_report.md`, or inability to ground recommendations in evidence. | High |
| `04-plan.md` | explicit failure conditions, explicit no-code-modification rule, explicit stop conditions, stronger plan-step structure requirement | Add `MUST NOT modify source code`; add stop conditions for missing required artifacts, ambiguous step structure, or output not matching the template; require fixed step blocks with stable IDs. | High |
| `05-refactor.md` | explicit forbidden behavior section, explicit stop conditions, explicit ambiguity handling | Add `MUST execute exactly one selected step`; add `MUST NOT modify unrelated files`; add `MUST STOP if selected step is ambiguous, missing, or not isolated enough to execute safely`. | Critical |
| `06-validate.md` | explicit no-code-modification rule, explicit required ordering, explicit PASS/FAIL requirement, explicit failure conditions | Add `MUST NOT modify source code`; add `MUST run only after Task 05`; add `MUST explicitly report PASS or FAIL`; add stop conditions for missing context or inability to produce a verdict. | Critical |

## Protocol Additions By Task

### Tasks 01 Through 04
Add these protocol rules explicitly:

- `MUST NOT modify source code.`
- `MUST STOP if any required input artifact is missing.`
- `MUST STOP if the declared output cannot be produced in the required template structure.`

### Task 05
Add these protocol rules explicitly:

- `MUST execute exactly one selected refactor step.`
- `MUST NOT modify unrelated files.`
- `MUST STOP if the selected step is ambiguous, missing, or combines unrelated concerns.`

### Task 06
Add these protocol rules explicitly:

- `MUST run after Task 05 for the same selected step.`
- `MUST NOT modify source code.`
- `MUST STOP if required context is missing.`
- `MUST explicitly report PASS or FAIL.`

## File-Specific Hardening Notes

### `01-understand.md`
- Convert narrative framing into explicit scope and input language.
- Make conservative evidence gathering a stop rule, not just a style preference.

### `02-diagnose.md`
- Tighten the task so it clearly fails when the orientation artifact is absent or insufficient.

### `03-architecture.md`
- Tighten the task so architectural recommendations cannot proceed without evidence from Tasks `01` and `02`.

### `04-plan.md`
- Require fixed refactor-step structure aligned with the hardened template.
- Tighten step atomicity into a stop condition, not just guidance.

### `05-refactor.md`
- Make one-step discipline and unrelated-file prohibition unambiguous.
- Add explicit stop behavior for ambiguous or unsafe steps.

### `06-validate.md`
- Make explicit verdict reporting mandatory.
- Add stop behavior for missing implementation context or missing plan context.

## Result
- Every core task now has a concrete hardening recommendation.
- Missing fail and stop conditions are documented.
- A deterministic upgrade path exists for the full `01` through `06` suite.
