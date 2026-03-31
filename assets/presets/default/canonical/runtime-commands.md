# Runtime Commands

Run these commands inside your coding agent after `prodify init`.

## Manual Bootstrap

- First tell the agent: `Read .prodify/AGENTS.md and bootstrap Prodify for this repository.`
- Keep the run anchored to `.prodify/AGENTS.md`, `.prodify/project.md`, `.prodify/planning.md`, `.prodify/tasks/`, and `.prodify/state.json`.

## Commands

- `$prodify-init`
  - inspect `.prodify/`
  - select the active agent/runtime mode
  - initialize `.prodify/state.json`
  - prepare `understand` as the first stage

- `$prodify-execute`
  - run one workflow stage
  - update runtime state after the stage
  - pause for validation between stages

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
