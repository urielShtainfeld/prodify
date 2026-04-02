# 01-understand

## Current State
- The repository is a TypeScript and Node.js CLI product centered on `prodify init`, `status`, `doctor`, and `update`, with runtime flow logic in `src/core/` and preset loading in `src/presets/`.
- The checked-in `.prodify/` directory is being used as a self-hosted runtime workspace for Prodify itself, while `assets/presets/default/canonical/` defines the generated default preset contents.
- The runtime contract layer, validation tests, and flow-state code use numbered stage artifacts such as `.prodify/artifacts/01-understand.md`, but the checked-in `.prodify/tasks/` and several design artifacts still reference legacy names such as `orientation_map.md` and `refactor_plan.md`.
- Repository guidance is inconsistent about root-level agent files: `README.md`, `.prodify/AGENTS.md`, and integration tests say the default lifecycle is `.prodify`-first with no required root-level agent files, while multiple docs under `docs/` still describe generated root-level compatibility files such as `AGENTS.md`.

## Open Questions
- Whether the checked-in root `AGENTS.md` should remain purely as repository-local contributor guidance or be removed entirely from the visible product story.
- Whether the self-hosted `.prodify/` workspace should continue to include repo-specific development artifacts beyond the generated default preset, or be trimmed closer to the preset footprint.
- Which documentation pages that still describe compatibility-file generation are still intentional future-design notes versus stale product claims that should now be corrected.

## Policy Checks
- Operate only on verified data.
- Preserve the existing behavior during understanding.

## Repository Summary
- Project name: Prodify.
- Primary stack: TypeScript, Node.js, npm, compiled `dist/` output from `src/`.
- Project type: CLI plus in-agent contract-driven runtime scaffolding.
- Primary entry points: `src/cli.ts`, `src/index.ts`, `src/commands/init.ts`, `src/commands/status.ts`, `src/commands/doctor.ts`, `src/commands/update.ts`.
- High-centrality modules for Task 65: `src/presets/loader.ts`, `src/core/preset-validation.ts`, `src/core/paths.ts`, `src/core/validation.ts`, `README.md`, `docs/`, `assets/presets/default/canonical/`, and the checked-in `.prodify/` workspace.
- Key architectural boundary for this task: generated preset assets, checked-in self-hosted `.prodify/`, runtime validation contracts, docs, and tests must communicate the same `.prodify`-first model.

## Success Criteria
- The repository intent is captured clearly.
- Known unknowns are listed explicitly.
