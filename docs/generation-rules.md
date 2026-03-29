# Compatibility File Generation Rules

## Goal
Define how canonical `.prodify/` sources become agent-specific compatibility files.

## General Generation Pipeline
1. Resolve repository root.
2. Load canonical `.prodify/` sources required for the target.
3. Apply the target-specific mapping rules.
4. Prepend the standard generated-file header.
5. Normalize output formatting.
6. Write the managed compatibility file to the target path.

## Target Rules

### Codex
- Status: `supported`
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
  - none in v1

### Claude
- Status: `planned`
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
- Status: `planned`
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
- Status: `experimental`
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
Codex is the reference implementation for v1 because it has:
- one canonical source file
- one explicit output path
- no required semantic transformation beyond the generated header
- an already-proven repository-root instruction file pattern
