# Copilot Support

## Goal
Define the compatibility target for GitHub Copilot.

## Compatibility Mapping
- Status: `planned`
- Canonical sources:
  - `.prodify/AGENTS.md`
  - `.prodify/project.md`
- Generated target: `.github/copilot-instructions.md`

## Generation Behavior
- Generate `.github/copilot-instructions.md` from canonical Prodify sources.
- Prepend the standard generated-file header for target `copilot`.
- Transform the canonical material into a concise instruction file suitable for an editor-integrated assistant.

## Transformation Rules
- Keep repository rules, goals, and high-signal conventions.
- Include concise project context from `.prodify/project.md`.
- Remove low-signal runtime orchestration details that are only useful for the full Prodify executor.
- Preserve deterministic section ordering.

## Sync Behavior
- `prodify sync` may update `.github/copilot-instructions.md` when it is Prodify-managed.
- `prodify doctor` must validate path existence, header validity, and content drift.

## Notes
- The expected output path is `.github/copilot-instructions.md`.
- If the transformation rules are incomplete, generation must stop instead of producing a vague or partial file.
