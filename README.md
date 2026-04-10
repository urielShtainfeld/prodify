# 🚀 Prodify

> **A compiler that turns chaotic AI-generated code into production-grade systems**

---

## ⚡ TL;DR

```text
AI writes messy code
↓
Prodify enforces structure, refactoring, validation, and scoring
↓
You get measurable production-grade improvement — or the run fails
```

---

## 💡 What is Prodify?

Prodify is **not** a coding agent.

It is a **deterministic execution runtime** that forces AI agents to:

- understand a codebase
- diagnose real structural problems
- define architecture
- plan safe refactors
- execute real code changes
- validate improvements
- measure impact

Prodify is designed for **messy, AI-generated, inconsistent, or fast-grown repositories** that need to become production-grade.

---

## 🔥 Core Principle

Prodify does not win by giving better suggestions.

Prodify wins by enforcing a workflow where agents must:

- change real files
- satisfy stage contracts
- pass validation
- improve measurable quality

If the run does not produce meaningful change, it should fail.

---

## 🧠 The Pipeline

Prodify executes a strict staged workflow:

```text
1. Understand
2. Diagnose
3. Architecture
4. Plan
5. Refactor
6. Validate
```

Each stage is:

- contract-driven
- validated
- stateful
- blocking

That means stages do not advance just because the agent “says it is done.”

---

## 💣 Enforcement

Prodify is built to prevent no-op runs.

### Refactor must:
- modify real files
- follow the selected plan step
- introduce meaningful structural improvement

### Validate must:
- verify actual code changes
- verify contract compliance
- verify impact/scoring improvement
- fail low-impact runs

---

## 📊 Built-in Scoring

Scoring is part of the normal workflow.

Each run should include:

```text
Baseline Score → Before execution
Final Score    → After execution
Delta          → Measurable improvement
```

Example:

```text
Baseline: 41
Final: 73
Delta: +32
```

Low or insignificant impact should not be treated as success.

---

## ⚙️ Usage

### 1. One-time setup (per machine / per agent)

```bash
prodify setup-agent codex
# or
prodify setup-agent claude
```

This installs or registers the `$prodify-*` commands for that agent environment.

---

### 2. Initialize a repository

```bash
prodify init
```

This creates the `.prodify/` workspace inside the repo.

Prodify initialization is **agent-agnostic** inside the repository.

That means:
- the repo is not locked to a single agent
- the same repo can be used with multiple supported agents
- the active agent is resolved at runtime when `$prodify-init` runs

---

### 3. Run inside the agent

```text
$prodify-init
$prodify-execute
```

To continue later:

```text
$prodify-resume
```

`$prodify-init` is the **only normal bootstrap entrypoint** inside the agent.

You should not need a separate manual bootstrap prompt as part of the primary flow.

---

## 🧱 Architecture

```text
.prodify/
  contracts-src/   # human-readable source contracts
  contracts/       # compiled runtime contracts
  artifacts/       # stage outputs
  metrics/         # baseline/final scoring
  skills/          # product-owned skill definitions
  runtime/         # compact runtime bootstrap + context packs
  state.json
  version.json
```

---

## ⚡ Runtime Model

Prodify is designed to be token-efficient.

Runtime uses compact machine-readable files such as:

```text
.prodify/runtime/bootstrap.json
.prodify/runtime/current-stage.json
```

The goal is to avoid forcing agents to repeatedly reload broad context from many files.

Runtime should rely on:

- one compact bootstrap manifest
- one stage-local context pack
- compiled contracts
- cached repo/skill/freshness metadata
- compact artifact summaries where possible

---

## 🤖 Agent-Agnostic by Design

Inside the repo, Prodify does not lock execution to one agent.

That means:

- `prodify init` stays agent-neutral
- multiple supported agents can be used on the same repo
- agent-specific setup is global, not embedded in the repo
- runtime behavior is resolved when the active agent runs `$prodify-init`

---

## 🧠 Skills

Prodify supports stage-bounded skills.

Skills may improve execution quality by adding targeted expertise such as:

- codebase scanning
- TypeScript backend refactoring
- architecture design
- test hardening
- maintainability review

But skills are **not** a second source of truth.

Contracts and validators remain authoritative.

---

## 🔁 State and Resume

Prodify persists execution state under `.prodify/`.

That allows:

- resumable runs
- deterministic stage progression
- strict stage blocking
- validation-aware continuation

Resume flow:

```text
$prodify-resume
```

---

## 📦 Typical Outputs

After a run, you should expect artifacts such as:

```text
.prodify/artifacts/
  01-understand.md
  02-diagnose.md
  03-architecture.md
  04-plan.md
  05-refactor.md
  06-validate.md
```

And metrics such as:

```text
.prodify/metrics/
  baseline.json
  final.json
```

---

## ❌ What Prodify is NOT

Prodify is not:

- a generic code generator
- a linter
- a formatter
- a framework
- a replacement for an agent

---

## ✅ What Prodify IS

Prodify is:

> a deterministic runtime that forces AI agents to produce real, validated, measurable code transformation

---

## 🚀 Vision

Turn this:

```text
AI output → chaotic code
```

into this:

```text
AI execution → structured, validated, production-grade systems
```

---

## ⚡ One-liner

> **Prodify is a compiler for AI-driven software development.**
