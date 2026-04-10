# Repository Contributor Guidance

This root `AGENTS.md` is repository-local contributor guidance only.

It is not the canonical runtime bootstrap or execution interface used by Prodify during normal execution.

The actual runtime flow lives inside:

```text
.prodify/
```

and is bootstrapped inside the agent through:

```text
$prodify-init
```

---

## What this file is for

Use this file only as a lightweight contributor note for people working on the Prodify repository itself.

It should not define an alternative execution model.

It should not redefine runtime state, task flow, or bootstrap behavior.

---

## Source of truth for runtime behavior

For actual Prodify runtime behavior, use these files instead:

```text
.prodify/AGENTS.md
.prodify/contracts/*.contract.json
.prodify/runtime/bootstrap.json
.prodify/runtime/current-stage.json
.prodify/state.json
```

And for product-level documentation, use:

```text
README.md
```

---

## Current repository expectations

When changing the Prodify codebase:

- keep `.prodify/` as the product-owned runtime footprint
- keep repository init agent-agnostic
- keep `$prodify-init` as the primary inside-agent bootstrap entrypoint
- keep contracts authoritative
- keep validators authoritative
- keep scoring part of the regular workflow
- avoid reintroducing legacy root-level agent-file generation

---

## Important guardrails

Do not introduce or restore outdated runtime models such as:

- manual bootstrap as the primary path
- `install --agent` style repo-local compatibility generation
- root-level agent files as product-required runtime files
- alternate workflow state stored in ad hoc task/run files that conflict with `.prodify/state.json`
- the old task/template execution model rooted in `.prodify/tasks/` and `.prodify/templates/`

If documentation or code suggests a second execution model, it should be corrected or removed.

---

## If you are updating runtime behavior

When runtime flow changes, update the canonical sources together:

- `README.md`
- `.prodify/AGENTS.md`
- `.prodify/runtime-commands.md`
- runtime manifest/state generation logic
- relevant tests

This file should stay short and should not become a second runtime spec.

---

## One-line mental model

Prodify runtime lives in `.prodify/`.

This root file exists only to help contributors avoid reintroducing stale models.
