# Prodify

Prodify turns AI- or vibe-coded repositories into production-grade code through a deterministic, agent-native workflow.

## Problem

Fast AI-generated code tends to drift into inconsistent structure, weak validation, and unclear ownership. Prodify gives that repo a repeatable upgrade path instead of relying on ad hoc prompting.

## Product

Prodify has two layers:

- external CLI for repository setup and health
- inside-agent runtime commands for actually running the transformation flow

The canonical source of truth lives in `.prodify/`. Generated agent files are adapters. The coding agent is the execution engine.

## Architecture

External CLI:

- `prodify init`
- `prodify status`
- `prodify doctor`
- `prodify update`

Inside the agent:

- `$prodify-init`
- `$prodify-execute`
- `$prodify-execute --auto`
- `$prodify-resume`

## User Flow

1. Initialize the repository:

```sh
node ./src/index.js init
```

2. Open the supported agent you want to use:

- Codex
- Claude
- Copilot
- OpenCode

3. Inside that agent, run `$prodify-init`.

4. Run `$prodify-execute` for stage-by-stage execution, or `$prodify-execute --auto` to continue until a hard stop.

5. If the flow pauses for validation or is interrupted, continue with `$prodify-resume`.

6. Use `prodify status`, `prodify doctor`, and `prodify update` from the CLI to inspect or refresh the repo-side scaffolding.

## Repo Model

- `.prodify/` is canonical.
- Generated compatibility files are reproducible adapters.
- `.prodify/state.json` stores the runtime control state.
- The agent reads the Prodify runtime model and executes the workflow stages.

## Supported Agents

- Codex → `AGENTS.md`
- Claude → `CLAUDE.md`
- Copilot → `.github/copilot-instructions.md`
- OpenCode → `.opencode/AGENTS.md`

## Development

Run the test suite:

```sh
npm test
```

The implementation lives primarily in:
- `src/`
- `assets/presets/default/`
- `tests/`
- `docs/`

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).
