# Codex Support

## Goal
Define the current Codex bootstrap path and keep any future compatibility-file mapping clearly out of the default lifecycle.

## Current Supported Behavior
- Status: `supported`
- Bootstrap entrypoint: `.prodify/AGENTS.md`
- Root `AGENTS.md` generation: not part of the default lifecycle

## Current Rules
- Tell Codex to read `.prodify/AGENTS.md`.
- Keep runtime state and workflow assets under `.prodify/`.
- Do not treat repository-root `AGENTS.md` as a product-managed output in the current flow.

## Future Compatibility Surface
- Historical or future compatibility mode could target repository-root `AGENTS.md`.
- If that mode returns, it must be explicit and opt-in rather than part of `prodify init` or `prodify update`.
- This repository's existing root `AGENTS.md` is contributor-local guidance for developing Prodify itself.

## Why This Distinction Matters
- Codex is supported today through the canonical `.prodify/AGENTS.md` bootstrap path.
- Presenting root `AGENTS.md` generation as current behavior would contradict the tested `.prodify`-first lifecycle.
- Any future compatibility-file design must remain subordinate to the canonical `.prodify` model.
