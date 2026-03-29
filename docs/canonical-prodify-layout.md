# Canonical `.prodify/` Layout

## Goal
Define `.prodify/` as the only user-edited source of truth for Prodify-managed repository guidance and workflow assets.

## Canonical Directory Tree

```text
.prodify/
  AGENTS.md
  project.md
  planning.md
  version.json
  tasks/
    README.md
    *.md
  rules/
    README.md
    *.md
  templates/
    README.md
    *.template.md
  presets/
    README.md
    default/
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

## Purpose Of Each Canonical Path

| Path | Purpose | User Edited |
| --- | --- | --- |
| `.prodify/AGENTS.md` | Canonical cross-agent operating instructions and repository protocol source. | Yes |
| `.prodify/project.md` | Human-readable project context, goals, scope, and conventions. | Yes |
| `.prodify/planning.md` | Human-readable roadmap, milestones, and execution backlog. | Yes |
| `.prodify/version.json` | Machine-readable preset version and schema version metadata. | Managed by Prodify upgrades |
| `.prodify/tasks/` | Canonical task library authored by the repository owner. | Yes |
| `.prodify/rules/` | Canonical reusable rules referenced by tasks and generated outputs. | Yes |
| `.prodify/templates/` | Canonical markdown templates that define required artifact shapes. | Yes |
| `.prodify/presets/` | Shipped preset packs and agent overlays used by `prodify init` and future upgrades. | Managed by Prodify / preset authors |

## Canonical vs Generated Split

### Canonical Files
- Live only under `.prodify/`.
- Are the only files users should edit directly when working with Prodify-managed content.
- Must remain agent-neutral unless a preset overlay explicitly defines agent-specific behavior.

### Generated Compatibility Files
- Live outside `.prodify/` at agent-specific target paths such as `AGENTS.md` or `.github/copilot-instructions.md`.
- Are derived artifacts generated from canonical `.prodify/` sources.
- Must always be reproducible from canonical sources plus deterministic generation rules.

## Root Cleanliness Rule
- The repository root should remain free of Prodify-owned files except compatibility files that an agent requires at a specific root-level path.
- Root-level generated files are allowed only when the target agent requires them.
- No shadow copies of canonical `.prodify/` content should be stored elsewhere in the repository.

## Separation Principle
- Canonical source content belongs in `.prodify/`.
- Compatibility outputs belong at agent-required target paths.
- Generated files must never become a second source of truth.

## Decision Summary
- `.prodify/` is canonical.
- Compatibility files are generated, never canonical.
- Repository root stays clean except for agent-required generated files.
