# `prodify install --agent <target>` Specification

## Goal
Define how Prodify installs compatibility files for a selected coding agent.

## Supported Invocation Shape
- `prodify install --agent codex`
- `prodify install --agent claude`
- `prodify install --agent copilot`
- `prodify install --agent opencode`

## Command Behavior
1. Resolve repository root.
2. Verify canonical `.prodify/` exists.
3. Verify the selected agent target is known.
4. Load canonical source file or files for the selected target.
5. Generate the compatibility file using the target’s mapping rules.
6. Write the generated file to the target path with the standard managed-file header.

## Per-Agent Behavior

### Codex
- Source: `.prodify/AGENTS.md`
- Target: `AGENTS.md`
- Generation: direct copy with generated header

### Claude
- Source: `.prodify/AGENTS.md`
- Target: `CLAUDE.md`
- Generation: direct copy with generated header
- Availability: planned; CLI may report “documented but not yet enabled”

### Copilot
- Sources:
  - `.prodify/AGENTS.md`
  - `.prodify/project.md`
- Target: `.github/copilot-instructions.md`
- Generation: transformed output with generated header
- Availability: planned; CLI may report “documented but not yet enabled”

### OpenCode
- Source: `.prodify/AGENTS.md`
- Target: `.opencode/AGENTS.md`
- Generation: direct copy with generated header
- Availability: experimental and opt-in

## Canonical Safety Rule
- `prodify install --agent <target>` must not modify canonical `.prodify/` source files.
- The command may create parent directories for generated target paths.

## Conflict Rules
- Managed existing file: may be updated subject to drift policy.
- Unmanaged existing file: stop by default.
- Experimental unsupported target: stop with a clear status message rather than guess.
