# Claude Support

## Goal
Define the compatibility target for Claude.

## Compatibility Mapping
- Status: `planned`
- Canonical source: `.prodify/AGENTS.md`
- Generated target: `CLAUDE.md`

## Generation Behavior
- Read `.prodify/AGENTS.md`.
- Prepend the standard generated-file header for target `claude`.
- Write the result to repository-root `CLAUDE.md`.
- In v1, preserve the canonical markdown body after the header.

## Direct Copy vs Transformation
- v1 behavior: direct copy with generated header.
- Future option: minor title normalization if Claude-specific naming proves useful.
- No semantic reduction should occur unless a later design explicitly defines it.

## Sync Behavior
- Planned target behavior should mirror Codex once implemented:
  - managed file can be regenerated
  - unmanaged file blocks generation by default
  - drift should be detected by `prodify doctor`

## Limitation
- Claude support is documented here, but may remain unavailable in the CLI until implemented.
