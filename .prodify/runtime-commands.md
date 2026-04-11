# Runtime Commands

Run these commands inside your coding agent after `prodify init`.
If this machine has not been prepared for that agent yet, run `prodify setup-agent <agent>` outside the repo first.

## Default Bootstrap

- Run `$prodify-init`.
- `$prodify-init` should read `.prodify/runtime/bootstrap.json` first, then `.prodify/runtime/current-stage.json`, then `.prodify/state.json`.
- `.prodify/AGENTS.md` is a compact human pointer, not the canonical machine bootstrap source.
- Repeated execution should prefer `.prodify/runtime/current-iteration.json`, `.prodify/runtime/delta.json`, and `.prodify/runtime/validation-delta.json` over replaying broad stage history.

## Commands

- `$prodify-init`
  - locate the repo root and `.prodify/`
  - read `.prodify/runtime/bootstrap.json`
  - detect or resolve the active agent/runtime mode
  - initialize `.prodify/state.json`
  - capture the baseline score snapshot for the normal execution run
  - prepare the bootstrapped state and the `understand` contract without locking the repo to one agent

- `$prodify-execute`
  - run one workflow stage
  - consume the compact iteration and delta runtime files
  - write stage artifacts under `.prodify/artifacts/`
  - validate the stage against the compiled contract JSON
  - keep scoring and validation aligned with the current stage outcome
  - update runtime state after the validation result
  - pause for validation checkpoints between stages in interactive mode

- `$prodify-execute --auto`
  - continue across stages without pausing
  - stop only on hard failure, policy block, required approval threshold, or invalid state

- `$prodify-resume`
  - continue from `.prodify/state.json`
  - reuse the compact iteration and delta runtime files
  - preserve validation checkpoints
  - expect final score and delta artifacts before a successful run closes
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
- Contract freshness metadata is cached under `.prodify/contracts/manifest.json`.
- Skill definitions live under `.prodify/skills/*.json`.
- Stage skill routing can activate bounded skills per stage, but contracts and validators remain authoritative.
- Stage completion is gated by compiled-contract validation, not by agent assertion alone.
