# Prodify

Prodify turns AI- or vibe-coded repositories into production-grade code through a deterministic, agent-native workflow.

## Product Purpose

Fast AI-generated code drifts into inconsistent structure, weak validation, and unclear ownership. Prodify gives that repo a repeatable upgrade path instead of relying on ad hoc prompting.

## Architecture

Prodify has two layers:

- external CLI for repository setup and health
- inside-agent runtime commands for actually running the transformation flow

External CLI:

- `prodify init`
- `prodify status`
- `prodify doctor`
- `prodify update`

Inside the agent:

- read `.prodify/AGENTS.md`
- `$prodify-init`
- `$prodify-execute`
- `$prodify-execute --auto`
- `$prodify-resume`

## Repo Model

- `.prodify/` is the only required product-owned footprint.
- No root-level agent files are required in the default flow.
- All durable workflow state lives in `.prodify/`.
- Legacy root-file generation remains only as deprecated compatibility support.

## User Flow

1. Initialize the repository:

```sh
npm run build
node ./dist/index.js init
```

2. Open the supported agent you want to use.

- Codex
- Claude
- Copilot
- OpenCode

3. Tell it: `Read .prodify/AGENTS.md and bootstrap Prodify for this repository.`

4. Inside that agent, run `$prodify-init`.

5. Run `$prodify-execute` for stage-by-stage execution, or `$prodify-execute --auto` to continue until a hard stop.

6. If the flow pauses for validation or is interrupted, continue with `$prodify-resume`.
7. Use `prodify status`, `prodify doctor`, and `prodify update` from the CLI to inspect or refresh the `.prodify/` scaffolding.

## Supported Agents

- Codex → `AGENTS.md`
- Claude → `CLAUDE.md`
- Copilot → `.github/copilot-instructions.md`
- OpenCode → `.opencode/AGENTS.md`

These legacy adapter paths remain available only for explicit compatibility flows. They are not required for the main product path.

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
