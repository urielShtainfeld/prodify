# `prodify sync` Specification

## Goal
Define how Prodify regenerates managed compatibility files from canonical `.prodify/` sources.

## Core Semantics
- `prodify sync` reads canonical `.prodify/` files.
- It regenerates managed compatibility files already installed in the repository.
- It must be deterministic and idempotent.
- It must report what changed.

## Target Discovery
- Default behavior: sync all files that are already recognized as Prodify-managed by their headers.
- Optional behavior: `prodify sync --agent <target>` may regenerate a specific documented target.
- Sync must not guess new targets that have never been installed unless the caller explicitly requests one.

## Sync Flow
1. Resolve repository root.
2. Verify `.prodify/` exists.
3. Detect managed generated files.
4. Recompute expected content for each managed target.
5. Compare expected vs existing content.
6. Rewrite only files whose canonical output has changed.
7. Report unchanged, updated, skipped, and failed targets.

## Managed-File Rules
- Only files with a valid Prodify header are eligible for automatic sync.
- Unmanaged files must not be overwritten by plain `sync`.
- Drifted managed files must follow the manual-edit conflict policy.

## Reporting
The command output should include:
- repository root
- targets inspected
- targets updated
- targets unchanged
- targets skipped or blocked

## Idempotency Rule
- Re-running `prodify sync` with unchanged canonical inputs must produce no content changes and no meaningless diffs.
