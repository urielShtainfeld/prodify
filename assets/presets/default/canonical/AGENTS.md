# Prodify Canonical Instructions

## Purpose

This is the canonical instruction source for repositories managed by Prodify.
Prodify upgrades vibe-coded repositories through an agent-native workflow.

## Rules

- `.prodify/` is the only source of truth.
- Generated compatibility files must be reproducible from canonical sources.
- Generated compatibility files are adapters, not the execution engine.
- External CLI commands prepare and inspect the repo.
- Runtime commands are executed inside the chosen coding agent.

## External CLI

- `prodify init`
- `prodify status`
- `prodify doctor`
- `prodify update`

## Runtime State

- `.prodify/state.json` tracks the current runtime state.
- `.prodify/runtime-commands.md` defines the commands used inside the agent.
