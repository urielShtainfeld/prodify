# Versioning And Upgrade Strategy

## Goal
Define how Prodify versions canonical preset content and upgrades repositories over time.

## Version Storage
- Store Prodify metadata in `.prodify/version.json`.
- Minimum fields:
  - `schema_version`
  - `preset_name`
  - `preset_version`

## Upgrade Model
- Upgrades operate on canonical `.prodify/` content first.
- Generated compatibility files are regenerated after canonical upgrades are complete.
- Upgrade logic must know the current preset version before attempting changes.

## Compatibility Checks
Before an upgrade, Prodify should verify:
- current `.prodify/version.json` is readable
- current preset version is known
- schema version is supported
- local canonical structure still matches expected upgrade preconditions

## Migration Surfacing
- If an upgrade needs a structural migration, Prodify must report it explicitly.
- The tool should tell the user:
  - current version
  - target version
  - files to be changed
  - whether manual review is required

## Generated File Behavior During Upgrade
- Generated compatibility files should not be hand-patched during upgrade.
- After canonical upgrade succeeds, `prodify sync` should regenerate managed targets deterministically.

## Safety Rules
- Do not rely on guesswork when a version is unknown.
- Stop if the repository has unsupported schema or missing required version metadata.
- Prefer explicit migration steps over implicit silent rewrites.
