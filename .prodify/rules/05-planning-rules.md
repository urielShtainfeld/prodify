# Rule 05 — Planning Rules

## Purpose
Ensure refactor plans are executable by coding agents.

## Rules
- Plans must be atomic.
- Each step must have a single clear objective.
- Each step should leave the codebase in a buildable state.
- Do not combine unrelated concerns in one step.
- Order work from safest to riskiest unless dependencies require otherwise.
- Prefer scaffolding and boundary creation before deep core rewrites.
- Every step must define:
  - description
  - files affected
  - risk
  - expected outcome
  - validation command or check

## Risk Weights
- low = 1
- med = 3
- high = 10
