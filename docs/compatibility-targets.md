# Compatibility Targets

## Goal
Describe possible compatibility-file targets without confusing them with the current default lifecycle.

## Current Lifecycle
- In the current supported flow, every agent bootstraps directly from `.prodify/AGENTS.md`.
- `prodify init` and `prodify update` do not create root-level compatibility files.
- The entries below are future or non-default compatibility surfaces only.

## Compatibility Matrix

| Agent | Agent Support | Current Bootstrap Path | Compatibility File Status | Target Path If Enabled | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex | Supported | `.prodify/AGENTS.md` | Not enabled in default flow | `AGENTS.md` | Root `AGENTS.md` in this repo is contributor-local, not product-generated. |
| Claude | Supported bootstrap path, compatibility target planned | `.prodify/AGENTS.md` | Planned | `CLAUDE.md` | Same canonical source, different future target path. |
| Copilot | Supported bootstrap path, compatibility target planned | `.prodify/AGENTS.md` | Planned | `.github/copilot-instructions.md` | Would likely need a shorter transformed output. |
| OpenCode | Supported bootstrap path, compatibility target experimental | `.prodify/AGENTS.md` | Experimental | `.opencode/AGENTS.md` | Target path remains provisional until validated. |

## Default Behavior

- Source of truth: `.prodify/AGENTS.md`
- No compatibility file is required for the current supported flow.
- Any future compatibility-file generation must remain explicit and opt-in.

## Compatibility Surfaces

### Codex
- Agent support: `supported`
- Current bootstrap path: `.prodify/AGENTS.md`
- Compatibility-file status: not enabled in the default lifecycle
- Future target path if enabled: `AGENTS.md`

### Claude
- Agent support: bootstrap path supported
- Current bootstrap path: `.prodify/AGENTS.md`
- Compatibility-file status: planned
- Future target path if enabled: `CLAUDE.md`

### Copilot
- Agent support: bootstrap path supported
- Current bootstrap path: `.prodify/AGENTS.md`
- Compatibility-file status: planned
- Future target path if enabled: `.github/copilot-instructions.md`

### OpenCode
- Agent support: bootstrap path supported
- Current bootstrap path: `.prodify/AGENTS.md`
- Compatibility-file status: experimental
- Future target path if enabled: `.opencode/AGENTS.md`
- Limitation: target path may change if the live integration contract differs

## Rules
- Every target path must be explicit.
- Every target must trace back to canonical `.prodify/` source files.
- Compatibility-file status controls non-default behavior:
  - `not enabled in default flow`: described only as a scoped future or repo-local compatibility surface
  - `planned`: documented but not implemented
  - `experimental`: opt-in only, with limitations clearly reported
