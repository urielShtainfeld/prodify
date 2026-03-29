# Idempotency Guarantees

## Goal
Define what idempotent Prodify sync behavior means and how it is preserved.

## Idempotency Definition
For identical:
- canonical `.prodify/` sources
- generation rules
- target set

`prodify sync` must produce byte-identical generated files on repeated runs.

## Stability Constraints
- Section ordering must be deterministic.
- Multi-source canonical input order must be deterministic.
- Header field ordering must be deterministic.
- Line endings must be normalized to LF.
- Final newline behavior must be stable.
- Optional fingerprint metadata must be computed deterministically.

## Diff Prevention Rules
- Avoid timestamps in generated files.
- Avoid non-deterministic ordering from filesystem traversal.
- Avoid unstable whitespace changes.
- Do not rewrite unchanged managed files.

## Command Behavior
- A repeated `prodify sync` with unchanged inputs should report targets as unchanged.
- Meaningless diffs are a bug.
- `prodify doctor` should be able to confirm that a generated file already matches the expected output exactly.
