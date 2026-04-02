# 02-diagnose

## Constraints
- The runtime contract layer, tests, and flow-state code already treat numbered stage artifacts under `.prodify/artifacts/` as canonical behavior, so any repair must preserve that observable runtime model.
- `prodify init` and `prodify update` must continue to avoid creating root-level compatibility files in the default lifecycle, because existing tests assert those paths stay absent.
- The checked-in `.prodify/` directory is both a self-hosted workspace and a repository artifact set, so cleanup must distinguish product-owned runtime layout from repo-specific historical design documents.

## Observed Issues
- Critical: `.prodify/tasks/01-understand.md` through `.prodify/tasks/06-validate.md` still referenced legacy artifact names such as `orientation_map.md`, `diagnostic_report.md`, and `refactor_plan.md` while compiled contracts and validation tests require `.prodify/artifacts/01-understand.md` through `.prodify/artifacts/06-validate.md`.
- Critical: repository guidance is contradictory about root-level compatibility files. `README.md`, `.prodify/AGENTS.md`, and `tests/integration/cli-flows.test.js` describe a `.prodify`-first lifecycle with no required root-level files, but `docs/codex-support.md`, `docs/compatibility-targets.md`, `docs/claude-support.md`, `docs/opencode-support.md`, and `docs/generation-rules.md` still describe generated root-level compatibility outputs.
- High: the checked-in self-hosted `.prodify/artifacts/` directory still contains legacy artifact files such as `.prodify/artifacts/orientation_map.md`, `.prodify/artifacts/diagnostic_report.md`, `.prodify/artifacts/refactor_plan.md`, `.prodify/artifacts/implementation_summary.md`, and `.prodify/artifacts/validation_report.md`, which visually conflicts with the numbered runtime artifact model.
- High: the default preset under `assets/presets/default/canonical/` ships only a minimal canonical footprint, while docs such as `docs/canonical-prodify-layout.md` describe a broader canonical tree and the checked-in repo-root `.prodify/` workspace contains many additional runtime and design files.
- Medium: the repository root still contains `AGENTS.md`, which is valid for this development environment but is indistinguishable at a glance from the deprecated product story unless documented explicitly.

## Policy Checks
- Diagnose from repository evidence only.
- Do not propose implementation changes in the diagnosis stage.

## Root Causes
- The repository completed a `.prodify`-first product transition in runtime code and tests before all self-hosted task files, templates, artifacts, and design docs were migrated to the same terminology.
- Historical design documentation for compatibility-file generation was retained in `docs/` after the default lifecycle moved away from root-level generated agent files, leaving multiple incompatible narratives in the repo.
- The self-hosted `.prodify/` workspace mixes active runtime assets with archived design outputs, so stale legacy artifact names remain visible even after the runtime adopted numbered artifacts.

## Success Criteria
- Every critical issue is tied to evidence.
- Root causes are separated from symptoms.
