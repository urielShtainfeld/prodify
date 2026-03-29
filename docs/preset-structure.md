# Preset Structure

## Goal
Define how Prodify ships reusable preset packs that populate canonical `.prodify/` contents.

## Preset Directory Layout

```text
presets/
  <preset-name>/
    preset.json
    canonical/
      AGENTS.md
      project.md
      planning.md
      tasks/
      rules/
      templates/
    overlays/
      codex/
      claude/
      copilot/
      opencode/
```

## Layout Semantics

### `preset.json`
- preset name
- preset version
- schema version
- description

### `canonical/`
- base files copied into `.prodify/` by `prodify init`
- agent-neutral source-of-truth content

### `overlays/`
- optional agent-specific additions or transformations applied on top of the base canonical content
- may define target-specific snippets, not compatibility outputs themselves

## Default vs Agent-Specific Content
- The default preset provides a coherent base `.prodify/` installation.
- Agent overlays adjust the canonical starter content when a user explicitly chooses them.
- Overlays must never replace the principle that `.prodify/` remains canonical.

## Mapping Rule
- Presets populate canonical `.prodify/` files and folders.
- Compatibility files are still generated later by install or sync commands.
