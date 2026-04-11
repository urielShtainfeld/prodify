# `prodify doctor` Specification

## Goal
Define a health-check command for validating Prodify repository setup.

## Required Checks

### Canonical Presence
- `.prodify/` exists
- `.prodify/AGENTS.md` exists
- `.prodify/project.md` exists
- `.prodify/planning.md` exists
- `.prodify/version.json` exists

### Canonical Structure
- core runtime files and directories exist under `.prodify/`
- optional extension surfaces, if present, keep their starter README files and remain clearly non-authoritative

### Compatibility Surface
- managed compatibility files exist where expected for installed or detected targets
- managed-file headers are valid
- generated files still map to known compatibility targets

### Scoring
- before runtime bootstrap, doctor may report scoring as pending
- after execution starts, the baseline score artifact should exist
- after successful validation, final and delta score artifacts should exist

### Drift Detection
- regenerate expected content in memory
- compare it to each managed file
- report drifted files without overwriting them

## Output Format
Doctor should report pass/fail lines grouped by category:
- `canonical`
- `compatibility`
- `drift`

Example shape:

```text
Prodify Doctor
canonical: PASS
compatibility/codex: PASS
compatibility/copilot: SKIP
drift/AGENTS.md: FAIL
```

## Exit Behavior
- exit success when all required checks pass and optional checks do not fail
- exit failure when canonical setup is missing, required generated files are invalid, or drift is detected on required managed files

## Rules
- `doctor` must not modify files
- `doctor` must report verified findings only
- `doctor` must distinguish `FAIL` from `SKIP`
