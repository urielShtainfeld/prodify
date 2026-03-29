# Improvement Evaluation Spec

Date: 2026-03-29
Scope: system-level evaluation of whether Prodify improves a codebase

## Comparison Method

Evaluate Prodify by comparing before-vs-after signals from the same repository across one bounded run scope.

Use these comparison stages:

1. capture baseline conditions before the run
2. capture artifacts and validation outcomes after the run
3. compare baseline to post-run state
4. classify the overall system result as pass, borderline, or fail

## Metrics

### Issue Count
Measure:

- number of diagnosed issues before refactor
- number of unresolved critical or high-severity issues after the validated step

Desired direction:

- unresolved issue count should decrease or become better structured and more actionable

### Architecture Clarity
Measure:

- clarity of subsystem boundaries
- explicitness of architecture decisions
- consistency between diagnosis and architecture proposal

Evidence sources:

- `diagnostic_report.md`
- `architecture_spec.md`
- `refactor_plan.md`

Desired direction:

- architecture should be clearer after the run than before

### Validation Score
Measure:

- final validation posture from `validation_report.md`
- category scores such as architecture, maintainability, reliability, and testability when available

Desired direction:

- no regression in validation posture
- ideally a clearer or stronger validation outcome after the change

### Maintainability Signals
Measure:

- duplication reduced or isolated
- naming clarity improved
- step size remained controlled
- changed code stayed within declared scope

Evidence sources:

- `implementation_summary.md`
- `validation_report.md`
- `task_log.json`

Desired direction:

- the code should be easier to understand, safer to extend, or more internally consistent

## Evaluation Criteria

### PASS
Classify the system as PASS when all of the following hold:

- at least one meaningful issue or structural problem was addressed
- architecture clarity improved or became more explicit
- validation result is PASS or a clearly acceptable non-regressive outcome
- maintainability signals improved
- the workflow stayed within declared task boundaries

### BORDERLINE
Classify as BORDERLINE when:

- documentation and planning improved, but code improvement is modest
- validation is inconclusive but no clear regression is present
- maintainability gains are present but weak

Borderline means the system may be promising but is not yet strongly proven.

### FAIL
Classify as FAIL when any of the following hold:

- issue count did not improve and no meaningful structure was added
- architecture clarity became worse or stayed confused
- validation shows regressions or clear failure
- the refactor exceeded declared scope
- artifacts are too weak to prove improvement

## Pass/Fail Criteria For Prodify Itself

Prodify as a system passes the sample evaluation when:

- it produces all required artifacts for the run scope
- it identifies real issues in the baseline codebase
- it proposes an actionable architecture and plan
- it executes at least one isolated improvement step safely
- it validates the outcome clearly enough to support a next-step decision

Prodify as a system fails when:

- the artifacts do not support deterministic continuation
- the workflow cannot distinguish success, failure, and blocked states
- the validated result does not show credible improvement or safe control

## Reporting Format

Use this compact reporting format for the overall evaluation:

```text
Evaluation result: <PASS|BORDERLINE|FAIL>
Issue count: <before> -> <after>
Architecture clarity: <before summary> -> <after summary>
Validation score: <before/unknown> -> <after summary>
Maintainability signals: <before summary> -> <after summary>
System verdict: <short explanation>
```

## Example Evaluation

```text
Evaluation result: PASS
Issue count: 8 -> 5
Architecture clarity: implicit and inconsistent -> explicit service boundaries proposed and partially enforced
Validation score: unknown -> PASS with improved maintainability and no regression detected
Maintainability signals: duplicated logic and weak naming -> one duplicated path removed and step scope stayed isolated
System verdict: Prodify improved the codebase measurably while keeping the workflow controlled.
```

## Practical Notes

- Use bounded runs for comparison; do not compare unrelated repo states.
- Prefer a small number of trustworthy metrics over a long checklist.
- Treat inconclusive validation as insufficient proof of improvement unless other strong evidence compensates, in which case classify as BORDERLINE rather than PASS.
