# Manual Edit Conflict Behavior

## Goal
Define what happens when users manually edit generated compatibility files.

## Default Policy
- Canonical `.prodify/` files remain the source of truth.
- Manual edits to generated files are treated as drift unless explicitly adopted through canonical changes.
- `prodify sync` must not silently erase manual edits without first detecting the conflict.

## Conflict Detection
A manual-edit conflict exists when:
- a file is recognized as Prodify-managed
- the current file content does not match the expected generated output
- the difference cannot be explained only by canonical source changes already being applied in the regenerated output

## Default Sync Behavior
- Stop and report the conflict.
- Identify the file path and target agent.
- Instruct the user to either:
  - move the change into `.prodify/`
  - rerun with `--force`
  - rerun with `--backup`

## Optional Resolution Modes

### `--force`
- Overwrite the managed generated file with the canonical output.
- No backup created automatically.

### `--backup`
- Write a backup copy before overwriting.
- Backup path should live under `.prodify/backups/` or another deterministic internal backup directory.

## Canonical Rule
- Conflict resolution must preserve the rule that canonical `.prodify/` content wins.
- Generated files must not become a shadow source of truth.
