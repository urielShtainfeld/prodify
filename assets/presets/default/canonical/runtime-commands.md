# Runtime Commands

Run these commands inside your coding agent after `prodify init`.

## Manual Bootstrap

- First tell the agent: `Read .prodify/AGENTS.md and bootstrap Prodify for this repository.`
- Keep the run anchored to `.prodify/AGENTS.md`, `.prodify/project.md`, `.prodify/planning.md`, `.prodify/contracts-src/`, `.prodify/contracts/`, `.prodify/artifacts/`, `.prodify/metrics/`, `.prodify/tasks/`, and `.prodify/state.json`.

## Commands

- `$prodify-init`
  - inspect `.prodify/`
  - select the active agent/runtime mode
  - initialize `.prodify/state.json`
  - prepare the bootstrapped state and the `understand` contract

- `$prodify-execute`
  - run one workflow stage
  - write stage artifacts under `.prodify/artifacts/`
  - validate the stage against the compiled contract JSON
  - update runtime state after the validation result
  - pause for validation checkpoints between stages in interactive mode

- `$prodify-execute --auto`
  - continue across stages without pausing
  - stop only on hard failure, policy block, required approval threshold, or invalid state

- `$prodify-resume`
  - continue from `.prodify/state.json`
  - preserve validation checkpoints
  - fail clearly if the state is corrupt or non-resumable

## Supported Runtime Profiles

- Codex
- Claude
- Copilot
- OpenCode

## Stage Order

- `understand`
- `diagnose`
- `architecture`
- `plan`
- `refactor`
- `validate`

## Contract Rules

- Source contracts live under `.prodify/contracts-src/*.contract.md`.
- Runtime execution reads only `.prodify/contracts/*.contract.json`.
- Stage completion is gated by compiled-contract validation, not by agent assertion alone.
