# Persona Removal Audit

Date: 2026-03-29
Task: `81-remove-persona-language`

## Files Reviewed
- `./.prodify/tasks/01-understand.md`
- `./.prodify/tasks/02-diagnose.md`
- `./.prodify/tasks/03-architecture.md`
- `./.prodify/tasks/04-plan.md`
- `./.prodify/tasks/05-refactor.md`
- `./.prodify/tasks/06-validate.md`

## Exact Persona Or Role Phrases Found

### `01-understand.md`
- `## Identity & Mandate`
- `Role: @Repository-Explorer`
- `Problem: Context rot and attention dilution in large codebases.`
- `## Data Contract`

### `02-diagnose.md`
- `## Identity & Mandate`
- `Role: @Security-Auditor`
- `Problem: Work slop and rapid unstructured additions destroying integrity.`
- `## Data Contract`

### `03-architecture.md`
- `## Identity & Mandate`
- `Role: @Principal-Architect`
- `Problem: Lack of structural intent in evolved legacy systems.`
- `## Data Contract`

### `04-plan.md`
- `## Identity & Mandate`
- `Role: @DevOps-Planner`
- `Problem: Big Bang refactors that break the CI pipeline.`
- `## Data Contract`

### `05-refactor.md`
- `## Identity & Mandate`
- `Role: @Implementation-Specialist`
- `Problem: Scope creep and unrelated cleanup in pull requests.`
- `## Data Contract`

### `06-validate.md`
- `## Identity & Mandate`
- `Role: @Quality-Gatekeeper`
- `Problem: Refactoring drift and hidden regressions.`
- `## Data Contract`

## Exact Replacements Required

Apply this structural replacement pattern to every non-compliant task:

- Replace `## Identity & Mandate` with:
  - `## Goal`
  - `## Scope`
- Replace `## Data Contract` with:
  - `## Inputs`
- Keep `## Execution Instructions`
- Keep `## Output Specification`
- Add:
  - `## Failure Conditions`
  - `## Definition of Done`

Replacement guidance:

- move the existing goal sentence into `## Goal`
- convert the existing problem framing into execution-relevant scope language only where it adds operational value
- remove role labels entirely
- remove narrative identity framing entirely

## Files Already Compliant
- None of the current `01` through `06` task files are fully compliant yet.

## Replacement Plan

### `01-understand.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

### `02-diagnose.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

### `03-architecture.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

### `04-plan.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

### `05-refactor.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

### `06-validate.md`
- remove persona and role framing
- replace with operational `Goal`, `Scope`, and `Inputs`

## Result
- All persona, role, and identity-framing language has been identified.
- A file-by-file removal plan exists.
- No ambiguity remains about what wording must be removed.
