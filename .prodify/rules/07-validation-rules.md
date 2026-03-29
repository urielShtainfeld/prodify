# Rule 07 — Validation Rules

## Purpose
Define how Prodify judges readiness after refactoring.

## Rules
- Validation must happen after every Task 05 execution.
- Be strict and evidence-based.
- Re-check architecture boundaries against `architecture_spec.json`.
- Re-check for dependency cycles where relevant.
- Highlight regressions introduced during refactoring.
- Do not mark PASS when meaningful high-severity issues remain unresolved in the modified scope.

## Scoring Dimensions
Score 0-100 for:
- architecture
- maintainability
- reliability
- testability

## Pass Guidance
A pass should mean:
- no critical regressions
- no unresolved high-severity violations in the changed scope
- structure improved measurably relative to baseline
