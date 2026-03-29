# Codex Support

## Goal
Define the first fully supported Prodify compatibility target: Codex.

## Compatibility Mapping
- Status: `supported`
- Canonical source: `.prodify/AGENTS.md`
- Generated target: `AGENTS.md`

## Generation Behavior
- Read `.prodify/AGENTS.md`.
- Prepend the standard generated-file header for target `codex`.
- Write the result to repository-root `AGENTS.md`.
- Preserve the canonical markdown body exactly after the header.

## Generated Header Requirements
The generated `AGENTS.md` must include:
- generated-by notice
- target agent `codex`
- canonical source `.prodify/AGENTS.md`
- regenerate command `prodify sync --agent codex`

## Sync Behavior
- If root `AGENTS.md` is managed by Prodify, `prodify sync` may update it.
- If root `AGENTS.md` exists but is unmanaged, Prodify must stop by default.
- `prodify doctor` must validate that root `AGENTS.md` matches the expected generated content.

## Why Codex Is The Reference Target
- The repo already uses a root `AGENTS.md` pattern.
- The mapping is simple and deterministic.
- It establishes the generated-file contract before more transformed targets are added.
