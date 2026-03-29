# Compatibility Targets

## Goal
Define the target files Prodify generates for each supported or planned coding agent.

## Compatibility Matrix

| Agent | Status | Canonical Source File(s) | Generated Target Path | Generation Mode | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex | Supported | `.prodify/AGENTS.md` | `AGENTS.md` | Direct copy with generated header | First fully supported reference target. |
| Claude | Planned | `.prodify/AGENTS.md` | `CLAUDE.md` | Direct copy with generated header | Same instruction body, different target path. |
| Copilot | Planned | `.prodify/AGENTS.md`, `.prodify/project.md` | `.github/copilot-instructions.md` | Transformed output with generated header | Needs a shorter instruction shape tuned for Copilot’s repository instruction surface. |
| OpenCode | Experimental | `.prodify/AGENTS.md` | `.opencode/AGENTS.md` | Direct copy with generated header | Target path is provisional until OpenCode support is validated in a live integration. |

## Supported Targets

### Codex
- Status: `supported`
- Source of truth: `.prodify/AGENTS.md`
- Output path: `AGENTS.md`
- Expected behavior: one deterministic generated file at repository root

## Planned Targets

### Claude
- Status: `planned`
- Source of truth: `.prodify/AGENTS.md`
- Output path: `CLAUDE.md`
- Expected behavior: root-level instruction file with the standard generated header

### Copilot
- Status: `planned`
- Source of truth:
  - `.prodify/AGENTS.md`
  - `.prodify/project.md`
- Output path: `.github/copilot-instructions.md`
- Expected behavior: generated repository instruction file optimized for concise IDE guidance

## Experimental Targets

### OpenCode
- Status: `experimental`
- Source of truth: `.prodify/AGENTS.md`
- Output path: `.opencode/AGENTS.md`
- Expected behavior: generated instruction file only when the integration target is explicitly requested
- Limitation: target path may change if the real integration contract differs

## Rules
- Every target path must be explicit.
- Every target must trace back to canonical `.prodify/` source files.
- Support status controls default behavior:
  - `supported`: available in normal install and sync flows
  - `planned`: documented but not enabled unless implemented
  - `experimental`: opt-in only, with limitations clearly reported
