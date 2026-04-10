# AGENTS.md

Repository note: this root file exists only for contributors working on the Prodify source repository. It is not created by `prodify init` and it is not part of the default product lifecycle.

The product runtime entrypoints remain:

- `.prodify/AGENTS.md` for the compact human pointer
- `.prodify/runtime/bootstrap.json` for canonical machine-readable bootstrap state
- `.prodify/state.json` for durable runtime state

## Purpose

Use this repository to evolve the Prodify runtime itself.

When changing runtime behavior, keep the product story aligned with the current implementation:

- `prodify init` creates `.prodify/`
- the agent runs `$prodify-init`
- `$prodify-init` bootstraps from `.prodify/runtime/bootstrap.json`
- execution and resume flow from `.prodify/state.json`
- stage validation is enforced by compiled contracts in `.prodify/contracts/*.contract.json`

## Contributor Rules

- Treat root `AGENTS.md` as contributor-local guidance only.
- Do not describe root `AGENTS.md` as a generated runtime file or as a required user entrypoint.
- Keep the main product flow `.prodify`-first and agent-agnostic.
- Keep machine-readable runtime truth in `.prodify/runtime/*.json`, `.prodify/state.json`, and `.prodify/contracts/*.contract.json`.
- Keep `.prodify/AGENTS.md` short and pointer-oriented.
- Preserve the default flow with no required root-level agent adapter files.

## Legacy Model Removal

The root guidance must not define or depend on the old task/template execution model.

Do not treat these as the canonical runtime control plane in the product story:

- `.prodify/artifacts/run_state.json`
- `.prodify/artifacts/task_log.json`
- `.prodify/tasks/*.md`
- `.prodify/templates/*.md`

Those files may still exist in this self-hosted repository for development history, testing, or migration context, but they are not the canonical runtime bootstrap or execution interface.

## Runtime Files That Matter

When reasoning about the live runtime, prefer these files in this order:

1. `.prodify/runtime/bootstrap.json`
2. `.prodify/runtime/current-stage.json`
3. `.prodify/state.json`
4. `.prodify/contracts/*.contract.json`
5. `.prodify/runtime-commands.md`
6. `.prodify/AGENTS.md`

## Validation Expectations

- Runtime changes should keep bootstrap deterministic.
- Status output should remain consumable in compact, verbose, and JSON forms.
- Contract freshness, repo context, and skill-resolution caches should stay synchronized with canonical inputs.
- Contributor-facing docs must not reintroduce the removed legacy runtime model.
