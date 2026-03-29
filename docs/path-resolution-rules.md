# Path Resolution Rules

## Goal
Define deterministic repository-root detection and output-path behavior for Prodify commands.

## Repository Root Detection
Prodify must resolve the repository root using this order:
1. Explicit `--repo` argument, if provided.
2. Current working directory, if it contains `.prodify/`.
3. Nearest parent directory containing `.prodify/`.
4. Nearest parent directory containing `.git/`, if `.prodify/` has not yet been created and the command supports bootstrap behavior.

If no repository root can be resolved, the command must stop.

## Path Normalization Rules
- All stored paths must be repository-relative.
- Absolute input paths may be accepted, but they must be normalized back to repository-relative paths before being written into managed files or reports.
- Path comparison must use normalized separators and remove redundant `.` segments.
- Prodify must not write outside the resolved repository root.

## Target Output Rules
- Every compatibility target path must resolve relative to the repository root.
- Parent directories may be created automatically when the target path is managed by Prodify.
- Commands must verify whether the target path already exists before writing.

## Existing File Behavior

### Managed Existing File
- If the file has a valid Prodify managed-file header, Prodify may update it.
- Drift handling must follow the managed-file conflict policy.

### Unmanaged Existing File
- If the file exists without a valid managed-file header, Prodify must stop by default.
- An explicit override flag is required to replace or adopt the file.
- This is the unmanaged-file path and it must never be resolved implicitly.

## Conflict Behavior
- Managed files with detected manual edits should trigger the manual-edit conflict flow.
- Unmanaged files at agent target paths should block generation by default.
- Resolution must be explicit and deterministic; no silent adoption is allowed.
