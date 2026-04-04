# Contract-Bounded Skill System

## Purpose

Prodify stages can use bounded skills to improve execution quality without weakening deterministic contracts.

The governing model is:

- contract defines required inputs, outputs, write boundaries, and success criteria
- validator decides pass or fail
- skill routing determines which stage-compatible skills may assist execution

## Ownership

- Stage routing lives in contract source frontmatter as `skill_routing`.
- Concrete skill definitions live in `.prodify/skills/`.
- `registry.json` is the discoverable manifest for product-owned skills.

## Skill Model

Every skill definition includes:

- `id`
- `name`
- `version`
- `category`
- `description`
- `intended_use`
- `stage_compatibility`
- optional `activation_conditions`
- `execution_guidance`
- optional `caution_guidance`

Supported categories:

- `stage-method`
- `domain`
- `quality-policy`

## Routing Model

Each compiled stage contract may include:

- `default_skills`
- `allowed_skills`
- `conditional_skills`

Conditional activation is explicit and deterministic. Current predicates can match:

- `language`
- `framework`
- `project_type`
- `architecture_pattern`
- `risk_signal`

## Determinism Rules

- Skills never override contract-required artifacts, allowed write paths, or validation.
- Stage-incompatible or unknown skills are rejected.
- Skill resolution is based on explicit repo context detection plus contract routing.
- Status reporting can show the stage, considered skills, active skills, and activation reasons.

## Current Examples

- `codebase-scanning` as a stage-method skill for `understand`
- `typescript-backend` as a domain skill activated when the repo language includes TypeScript
- `test-hardening` as a quality-policy skill for `refactor` and `validate`
