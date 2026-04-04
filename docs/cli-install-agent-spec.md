# `prodify setup-agent <target>` Specification

## Goal
Define how Prodify performs global, repo-neutral agent setup for a selected coding agent.

## Supported Invocation Shape
- `prodify setup-agent codex`
- `prodify setup-agent claude`
- `prodify setup-agent copilot`
- `prodify setup-agent opencode`

## Command Behavior
1. Verify the selected agent target is known.
2. Detect the global setup root outside any repository.
3. Register or refresh global runtime command availability for the selected agent.
4. Record the configured agent in global setup state.
5. Print next-step guidance for repo initialization and in-agent runtime use.

## Per-Agent Behavior

### Codex
- Global setup target: Codex runtime environment
- Repo impact: none
- Runtime commands exposed: `$prodify-init`, `$prodify-execute`, `$prodify-resume`

### Claude
- Global setup target: Claude runtime environment
- Repo impact: none
- Runtime commands exposed: `$prodify-init`, `$prodify-execute`, `$prodify-resume`

### Copilot
- Global setup target: Copilot runtime environment
- Repo impact: none
- Runtime commands exposed: `$prodify-init`, `$prodify-execute`, `$prodify-resume`

### OpenCode
- Global setup target: OpenCode runtime environment
- Repo impact: none
- Runtime commands exposed: `$prodify-init`, `$prodify-execute`, `$prodify-resume`

## Canonical Safety Rule
- `prodify setup-agent <target>` must not modify canonical `.prodify/` source files in any repository.
- The command writes only to global setup state outside the repo.

## Conflict Rules
- Existing agent setup entry: may be refreshed.
- Multiple configured agents must be allowed to coexist.
- Unsupported target: stop with a clear status message rather than guess.
