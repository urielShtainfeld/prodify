# Diff Validator Design

## Purpose

Prodify must reject refactor stages that only move whitespace, touch too few files, or fail to create meaningful structural change.

## Snapshot Model

- Capture a tracked repository snapshot before refactor.
- Compare the current tracked tree against that snapshot.
- Tracked roots:
  - `src/`
  - `tests/`
  - `assets/`

## Deterministic Outputs

- `filesModified`
- `filesAdded`
- `filesDeleted`
- `linesAdded`
- `linesRemoved`
- `formattingOnlyPaths`
- `structuralChanges`

## Structural Change Flags

- `new-directories`
- `new-layer-directories`
- `new-modules`
- `module-boundary-created`
- `responsibility-reduced`

## Validation Rules

- minimum files modified
- minimum lines changed
- optional file-creation requirement
- required structural flags
- formatting-only changes fail

## Plan Coupling

Refactor validation also confirms that the selected step in `05-refactor.md` maps to a real plan unit from `04-plan.md`.
