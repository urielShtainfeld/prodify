# Rule 02 — Analysis Discipline

## Purpose
Keep repository analysis deterministic and high-signal.

## Rules
- During analysis tasks, do not modify code.
- Distinguish clearly between observed facts and inferred conclusions.
- When inferring architecture or module roles, tie conclusions to concrete repository evidence.
- Ignore generated, vendored, cache, and build-output directories unless directly relevant.
- Prefer shallow-wide scanning before deep local inspection.
- For monorepos, identify workspace/package boundaries before reasoning about architecture.

## Anti-Patterns to Avoid
- Inventing structure not present in the repository
- Treating naming conventions as proof without corroborating evidence
- Over-indexing on one file while ignoring surrounding module context
