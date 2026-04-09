# Prodify

Prodify turns AI- and vibe-coded repositories into production-grade repositories through a deterministic, agent-native workflow.

It gives a repo a repeatable upgrade path instead of relying on ad hoc prompting, one-off cleanup passes, or agent memory. The CLI bootstraps the runtime. The coding agent executes the staged transformation flow inside the repo.

## Why Prodify

- Turn messy AI-generated repos into structured, reviewable systems.
- Keep runtime state, tasks, artifacts, contracts, and metrics inside `.prodify/`.
- Separate repository setup from in-agent execution.
- Validate stage outputs against compiled contracts instead of trusting freeform agent claims.

## Quick Start

Install Prodify from npm:

```sh
npm install -g @urielsh/prodify
```

Prepare your coding agent once per machine:

```sh
prodify setup-agent codex
```

Initialize a target repository:

```sh
cd path/to/your-repo
prodify init
```

Then open your coding agent and start the runtime:

```text
$prodify-init
$prodify-execute
```

Use `$prodify-execute --auto` to continue without pausing between stages, or `$prodify-resume` to continue an interrupted run.

## Using Prodify In Your Repo

1. Install the npm package.
2. Run `prodify setup-agent <agent>` once per machine for the agent you use.
3. Run `prodify init` inside the repository you want to upgrade.
4. Open that repository in a supported coding agent.
5. Tell the agent to read `.prodify/AGENTS.md`.
6. Run `$prodify-init`, then continue with `$prodify-execute` or `$prodify-execute --auto`.

Prodify keeps repository initialization agent-agnostic. The active runtime is resolved when `$prodify-init` runs inside the opened agent, not when `prodify init` creates `.prodify/`.

## How It Works

- `prodify init` creates the `.prodify/` runtime workspace in the repo.
- The agent reads `.prodify/AGENTS.md` as the runtime entrypoint.
- `$prodify-init` prepares the in-agent run state.
- `$prodify-execute` runs one stage at a time.
- `$prodify-execute --auto` keeps advancing until a hard stop.
- `$prodify-resume` continues from the saved runtime state.

Stage order:

- `understand`
- `diagnose`
- `architecture`
- `plan`
- `refactor`
- `validate`

## CLI Commands

- `prodify setup-agent <codex|claude|copilot|opencode>`
  One-time machine setup for the coding agent runtime.
- `prodify init`
  Create the `.prodify/` workspace in a repository.
- `prodify status`
  Inspect runtime state and recommended next actions.
- `prodify doctor`
  Check runtime health, generated files, and execution readiness.
- `prodify update`
  Refresh the local Prodify workspace, compiled contracts, and related runtime assets.

## Agent Runtime Commands

- `$prodify-init`
  Bootstrap Prodify inside the opened coding agent.
- `$prodify-execute`
  Run the next workflow stage interactively.
- `$prodify-execute --auto`
  Continue across stages until a hard stop or policy gate.
- `$prodify-resume`
  Continue from the saved `.prodify/state.json` runtime state.

## Repo Model

- `.prodify/` is the only required product-owned footprint.
- Durable workflow state lives in `.prodify/state.json`.
- Tasks live under `.prodify/tasks/`.
- Stage outputs live under `.prodify/artifacts/`.
- Skill definitions live under `.prodify/skills/`.
- Local baseline, final, and delta scoring artifacts live under `.prodify/metrics/`.
- Fresh product users do not need root-level agent files.

## Contracts And Validation

- Humans edit contract sources under `.prodify/contracts-src/`.
- Runtime execution reads only compiled contracts under `.prodify/contracts/`.
- Stage completion is gated by compiled-contract validation.
- Validation checks required artifacts, write boundaries, forbidden writes, Markdown sections, JSON keys, and contract criteria.

## Local Scoring

- Prodify can persist baseline, final, and delta score artifacts under `.prodify/metrics/`.
- Raw outputs and normalized scores are stored separately so scoring stays traceable and deterministic.

## Supported Agents

- Codex
- Claude
- Copilot
- OpenCode

All supported agents share the same bootstrap path: read `.prodify/AGENTS.md`, then run `$prodify-init`.

## Development / Contributing

Prodify users and Prodify contributors follow different entrypoints:

- Product users start from `.prodify/AGENTS.md` inside the repository they want to improve.
- Contributors working on the Prodify source repository follow the root [AGENTS.md](/Users/urielsh/projects/prodify/AGENTS.md).

For this self-hosting repository, the checked-in repo-root `.prodify/` directory is a development workspace for Prodify itself, not a byte-for-byte snapshot of fresh `prodify init` output.

Run the source-repo test suite with:

```sh
npm test
```

The main implementation lives in:

- `src/`
- `assets/presets/default/`
- `tests/`
- `docs/`

## License

This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).
