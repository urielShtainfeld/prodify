# Prodify Agent Entry

Run `$prodify-init`.

That command should bootstrap Prodify from `.prodify/runtime/bootstrap.json` and keep the full workflow anchored to `.prodify/`.

## Core Rules

- `.prodify/` is the only source of truth.
- `.prodify/runtime/bootstrap.json` is the canonical machine-readable bootstrap source.
- `.prodify/runtime/current-stage.json` is the compact machine-readable stage context pack.
- Humans edit `.prodify/contracts-src/`; runtime reads only `.prodify/contracts/*.contract.json`.
- No root-level `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, or `.opencode/AGENTS.md` is required for the main flow.
- Repository initialization remains agent-agnostic. The active agent is resolved when `$prodify-init` runs, not when `prodify init` creates `.prodify/`.
- External CLI commands prepare and inspect the repo.
- Runtime commands are executed inside the chosen coding agent.
- Durable workflow state lives in `.prodify/state.json`.

## External CLI

- `prodify init`
- `prodify setup-agent`
- `prodify status`
- `prodify doctor`
- `prodify update`

## Runtime Files

- `.prodify/AGENTS.md`
- `.prodify/project.md`
- `.prodify/planning.md`
- `.prodify/runtime/bootstrap.json`
- `.prodify/runtime/current-stage.json`
- `.prodify/contracts-src/`
- `.prodify/contracts/`
- `.prodify/skills/`
- `.prodify/artifacts/`
- `.prodify/metrics/`
- `.prodify/tasks/`
- `.prodify/state.json`
- `.prodify/runtime-commands.md`

## Stage Skill System

- Contracts may declare stage-bounded `skill_routing`.
- Concrete skill definitions live under `.prodify/skills/`.
- Skills can improve stage execution quality, but they must not override contracts, write boundaries, or validation outcomes.

## Runtime Commands

- `$prodify-init`
- `$prodify-execute`
- `$prodify-execute --auto`
- `$prodify-resume`

## Compatibility

If the agent cannot use `$prodify-init` directly, treat this file as a human pointer and then load `.prodify/runtime/bootstrap.json`.
