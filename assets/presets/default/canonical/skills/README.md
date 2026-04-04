# Skills

This directory contains the product-owned skill registry for deterministic stage execution.

- `registry.json` is the manifest and source of truth for discoverable skills.
- Each `*.skill.json` file defines one bounded skill.
- Contracts may reference skills only through explicit `skill_routing`.
- Skills can improve execution quality, but they never override compiled contracts or validation.
