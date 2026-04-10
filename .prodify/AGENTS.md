# Prodify Agent Entry

Run `$prodify-init`.

That command should bootstrap Prodify from `.prodify/runtime/bootstrap.json` and keep the full workflow anchored to `.prodify/`.

## Core Rules

- `.prodify/` is the only source of truth.
- `.prodify/runtime/bootstrap.json` is the canonical machine-readable bootstrap source.
- `.prodify/runtime/current-stage.json` is the compact machine-readable stage context pack.
- Humans edit `.prodify/contracts-src/`; runtime reads only `.prodify/contracts/*.contract.json`.
- No root-level `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, or `.opencode/AGENTS.md` is required for the main flow.
- If this repository also contains a root `AGENTS.md`, treat it as repository-local contributor guidance unless explicitly documented otherwise.
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
- `.prodify/artifacts/`
- `.prodify/metrics/`
- `.prodify/tasks/`
- `.prodify/state.json`
- `.prodify/runtime-commands.md`

Active stage outputs under `.prodify/artifacts/` use numbered filenames:
- `01-understand.md`
- `02-diagnose.md`
- `03-architecture.md`
- `04-plan.md`
- `05-refactor.md`
- `06-validate.md`

## Runtime Commands

- `$prodify-init`
- `$prodify-execute`
- `$prodify-execute --auto`
- `$prodify-resume`

## Compatibility

If the agent cannot use `$prodify-init` directly, treat this file as a human pointer and then load `.prodify/runtime/bootstrap.json`.
