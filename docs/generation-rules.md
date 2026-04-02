# Compatibility File Generation Rules

## Goal
Describe a possible future compatibility-file generation pipeline without treating it as active default behavior.

## Current Product Behavior
- The supported lifecycle bootstraps agents directly from `.prodify/AGENTS.md`.
- `prodify init` and `prodify update` do not generate compatibility files.
- The rules below are design notes for future or opt-in compatibility surfaces only.

## General Generation Pipeline
1. Resolve repository root.
2. Load canonical `.prodify/` sources required for the target.
3. Apply the target-specific mapping rules.
4. Prepend the standard generated-file header.
5. Normalize output formatting.
6. Write the managed compatibility file to the target path.

## Target Rules

### Codex
- Agent support status: `supported`
- Compatibility-file status: not enabled in the default flow
- Canonical sources:
  - `.prodify/AGENTS.md`
- Output path:
  - `AGENTS.md`
- Generation mode:
  - direct copy with generated header
- Transformations:
  - prepend standard generated header
  - preserve markdown body exactly after the header
- Unsupported feature handling:
  - do not imply this mode is active until a dedicated opt-in command exists

### Claude
- Agent support status: bootstrap path supported
- Compatibility-file status: planned
- Canonical sources:
  - `.prodify/AGENTS.md`
- Output path:
  - `CLAUDE.md`
- Generation mode:
  - direct copy with generated header
- Transformations:
  - prepend standard generated header
  - optionally normalize the top-level title to match the output filename in a future revision
- Unsupported feature handling:
  - emit a clear “planned target” note if generation is not yet enabled in the CLI

### Copilot
- Agent support status: bootstrap path supported
- Compatibility-file status: planned
- Canonical sources:
  - `.prodify/AGENTS.md`
  - `.prodify/project.md`
- Output path:
  - `.github/copilot-instructions.md`
- Generation mode:
  - transformed output with generated header
- Transformations:
  - merge high-signal repository instructions from `.prodify/AGENTS.md`
  - inject concise project context from `.prodify/project.md`
  - omit orchestration details that are not useful in a static instruction file
- Unsupported feature handling:
  - if required concise transformation rules are unavailable, stop instead of generating a lossy or ambiguous file

### OpenCode
- Agent support status: bootstrap path supported
- Compatibility-file status: experimental
- Canonical sources:
  - `.prodify/AGENTS.md`
- Output path:
  - `.opencode/AGENTS.md`
- Generation mode:
  - direct copy with generated header
- Transformations:
  - prepend standard generated header
  - preserve canonical body by default
- Unsupported feature handling:
  - clearly report the experimental status and provisional target path

## Shared Transformation Rules
- Generated files must keep markdown valid.
- Generated files must normalize line endings to LF.
- Generated files must preserve stable section order.
- Generation must be deterministic for identical inputs.

## Codex Reference Mapping
If compatibility-file generation is reintroduced, Codex remains the simplest reference mapping because it has:
- one canonical source file
- one explicit output path
- no required semantic transformation beyond the generated header
- a historically familiar repository-root instruction file pattern
