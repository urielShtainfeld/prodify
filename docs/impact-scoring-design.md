# Impact Scoring Design

## Purpose

Prodify should measure whether a run actually improved repository quality instead of only checking that files changed.

## Breakdown

- `structure`
- `maintainability`
- `complexity`
- `testability`

## Formula

```text
total =
  structure * 0.30 +
  maintainability * 0.30 +
  complexity * 0.20 +
  testability * 0.20
```

## Signals

- average function length
- module count
- average directory depth
- dependency depth
- average imports per module
- test file ratio

## Runtime Integration

- Write baseline score when a run is bootstrapped.
- Write final score and delta after validated completion.
- Enforce `min_impact_score` during validation.
- Show stored score delta in `prodify status`.
