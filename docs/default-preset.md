# Default Preset

## Goal
Define the first stable default preset for bootstrapping repositories with Prodify.

## Required Canonical Contents
The default preset must include:
- `.prodify/AGENTS.md`
- `.prodify/project.md`
- `.prodify/planning.md`
- starter tasks
- starter rules
- starter templates

## Minimum Viable Default Contents

### `.prodify/AGENTS.md`
- baseline repository operating instructions
- canonical source text for generated compatibility files

### `.prodify/project.md`
- project summary
- goals
- constraints
- conventions

### `.prodify/planning.md`
- milestone list
- backlog section
- open decisions section

### Starter Tasks
- `README.md`
- at least one example task or task schema description so users understand how canonical tasks should be authored

### Starter Rules
- `README.md`
- a small set of baseline operating rules for generated instruction files

### Starter Templates
- `README.md`
- at least one example markdown template showing how Prodify expects structured artifacts to look

## Preset Intent
- The default preset should be simple, stable, and agent-neutral.
- It should be sufficient for `prodify init` to leave the repository ready for later compatibility generation.
- It should not require generated compatibility files to exist immediately.
