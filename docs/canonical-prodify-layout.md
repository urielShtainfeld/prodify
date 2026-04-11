# Canonical `.prodify/` Layout

## Goal
Define the current `.prodify`-first runtime layout and the boundary between generated product assets and repository-local self-hosted additions.

## Canonical Directory Tree

```text
.prodify/
  AGENTS.md
  project.md
  planning.md
  version.json
  runtime-commands.md
  state.json
  artifacts/
    README.md
    <stage outputs and repo-local artifacts>
  contracts-src/
    README.md
    *.contract.md
  contracts/
    *.contract.json
  metrics/
    README.md
  tasks/
    README.md
    <optional repository-local planning aids>
  rules/
    README.md
    <optional repository-local rule overlays>
  templates/
    README.md
    <optional repository-local templates>
```

Preset source files for Prodify itself live in the repository under `assets/presets/default/canonical/`. They are not copied into `.prodify/presets/` in the current product model.

## Purpose Of Each Canonical Path

| Path | Purpose | User Edited |
| --- | --- | --- |
| `.prodify/AGENTS.md` | Canonical cross-agent operating instructions and repository protocol source. | Yes |
| `.prodify/project.md` | Human-readable project context, goals, scope, and conventions. | Yes |
| `.prodify/planning.md` | Human-readable roadmap, milestones, and execution backlog. | Yes |
| `.prodify/version.json` | Machine-readable preset version and schema version metadata. | Managed by Prodify upgrades |
| `.prodify/runtime-commands.md` | Canonical runtime command reference for in-agent execution. | Yes |
| `.prodify/state.json` | Durable runtime state for the agent-executed lifecycle. | Managed by runtime |
| `.prodify/contracts-src/` | User-authored stage contract sources. | Yes |
| `.prodify/contracts/` | Compiled runtime contracts consumed by validation and execution. | Managed by runtime |
| `.prodify/artifacts/` | Runtime stage outputs plus repo-local self-hosted design artifacts. | Mixed |
| `.prodify/metrics/` | Local baseline, final, and delta score artifacts. | Managed by runtime |
| `.prodify/tasks/` | Optional repository-local planning aids or deterministic task overlays. Not an authoritative runtime execution source. | Yes |
| `.prodify/rules/` | Optional repository-local rule overlays. Not part of the primary runtime control plane. | Yes |
| `.prodify/templates/` | Optional repository-local templates. Not part of the primary runtime control plane. | Yes |

## Fresh Init vs Self-Hosted Workspace

| Workspace | Typical contents | Interpretation |
| --- | --- | --- |
| Fresh user repo after `prodify init` | Core runtime files plus lightweight optional extension directories such as `.prodify/tasks/README.md`, `.prodify/rules/README.md`, and `.prodify/templates/README.md`. | Default product bootstrap layout. |
| This Prodify source repo | The same runtime core plus additional checked-in artifacts, rules, tasks, templates, and historical notes used to evolve Prodify itself. | Self-hosting development workspace, not a byte-for-byte fresh-init snapshot. |

## Canonical vs Generated Split

### Canonical Files
- Live only under `.prodify/`.
- Are the only product-owned files users should edit directly when working with Prodify-managed content.
- Must remain agent-neutral unless a preset overlay explicitly defines agent-specific behavior.

### Generated Compatibility Files
- Are not part of the current default lifecycle.
- If they exist in future or opt-in flows, they live outside `.prodify/` at agent-specific target paths.
- Must always be reproducible from canonical sources plus deterministic generation rules.

### Repository-Local Contributor Files
- May live outside `.prodify/` in the Prodify source repository itself.
- Are not product-owned runtime outputs.
- Must be documented explicitly when their path could be mistaken for a generated compatibility file.

## Root Cleanliness Rule
- The repository root should remain free of Prodify-owned runtime files in the default lifecycle.
- If the Prodify source repository keeps a root `AGENTS.md`, it must be treated as contributor-local guidance rather than a generated runtime file.
- No shadow copies of canonical `.prodify/` content should be stored elsewhere in the repository.

## Separation Principle
- Canonical source content belongs in `.prodify/`.
- Future compatibility outputs, if implemented, belong at agent-required target paths.
- Generated files must never become a second source of truth.

## Decision Summary
- `.prodify/` is canonical.
- The default supported flow does not require root-level generated agent files.
- Repository-local contributor files must be labeled explicitly when they share those legacy paths.
