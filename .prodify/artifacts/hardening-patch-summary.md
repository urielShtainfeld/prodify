# Hardening Patch Summary

## Scope
This patch applied the hardening changes defined by Tasks 81 through 84 to the canonical runtime at `.prodify/` and the root `AGENTS.md`.

## Files Changed
- `AGENTS.md`
- `.prodify/tasks/01-understand.md`
- `.prodify/tasks/02-diagnose.md`
- `.prodify/tasks/03-architecture.md`
- `.prodify/tasks/04-plan.md`
- `.prodify/tasks/05-refactor.md`
- `.prodify/tasks/06-validate.md`
- `.prodify/templates/refactor_plan.template.md`

## Changes Applied
### Persona and role language removal
- Removed persona-style sections such as `## Identity & Mandate`.
- Removed role labels and identity framing from the core task suite.
- Replaced persona framing with operational sections:
  - `## Goal`
  - `## Scope`
  - `## Inputs`
  - `## Execution Instructions`
  - `## Output Specification`
  - `## Failure Conditions`
  - `## Definition of Done`

### Task protocol hardening
- Added explicit failure conditions to every core task.
- Added explicit template conformance requirements for every task output.
- Added explicit non-modification constraints to Tasks `01` through `04` and `06`.
- Tightened Task `05` so it must execute exactly one selected refactor step and stop on ambiguous or widened scope.
- Tightened Task `06` so it must run after Task `05` for the same step and must emit an explicit `PASS` or `FAIL` verdict.

### Refactor plan template hardening
- Replaced the loose plan structure with a fixed repeated step block.
- Added `Total steps` to the summary section.
- Standardized each step block to:
  - `### Step: <ID>`
  - `- Status: pending`
  - `- Description:`
  - `- Files:`
  - `- Risk:`
  - `- Expected outcome:`
  - `- Validation command:`

### Runtime rule alignment
- Updated `AGENTS.md` to use `completed_step_ids` as the canonical completed-step field.
- Updated the refactor/validate loop wording so a failed validation retries or repairs the same selected step before continuing.
- Updated the stop condition so a passed validation continues only when more steps remain.

## Deviations From Plan
- `AGENTS.md` required a targeted update in addition to the task docs and template so the runtime contract would match the hardened task suite. This was necessary to avoid leaving conflicting loop and state semantics in the root protocol.

## Unresolved Items
- None identified in the hardening patch itself.
