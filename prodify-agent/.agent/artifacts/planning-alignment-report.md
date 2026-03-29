# Planning Alignment Report

Date: 2026-03-28
Task: `41-map-phases-to-plan`

## Scope

This report aligns the repo-level planning tasks with the actual `prodify-agent` execution system.

Inputs reviewed:

- `./.agent/tasks/41-map-phases-to-plan.md`
- `./.agent/tasks/*.md`
- `./prodify-agent/AGENTS.md`
- `./prodify-agent/.agent/artifacts/`
- `./planning.md` (missing)

## Current Planning Model

The current planning model is split across two layers:

1. Repo-level roadmap tasks in `./.agent/tasks/`
2. Runtime execution rules and runtime task files in `./prodify-agent/.agent/`

The roadmap tasks are grouped by task bands (`11-13`, `21-23`, `31-33`, `41-42`, `51-52`, `61-62`, `71-72`) and form a linear next-task chain. The runtime system is currently defined as a fixed six-task execution pipeline in `./prodify-agent/AGENTS.md`.

## Phase-To-Task Mapping

| Phase Band | Planning Intent | Repo-Level Tasks | Runtime Surface Affected | Current Output |
| --- | --- | --- | --- | --- |
| 10 | Normalize task contracts | `11`, `12`, `13` | `./prodify-agent/.agent/tasks/`, `./prodify-agent/.agent/templates/` | audits and validation spec |
| 20 | Define execution state and dispatch | `21`, `22`, `23` | `run_state.json`, dispatcher behavior, artifact validation | design docs |
| 30 | Define refactor loop control | `31`, `32`, `33` | step selection, Task `05`/`06` loop, completed-step tracking | design docs |
| 40 | Align planning to execution and decide next actions | `41`, `42` | planning source, next-step resolution | alignment and resolver design |
| 50 | Add operator-facing command surface | `51`, `52` | CLI/status interface | not started |
| 60 | Improve run reporting | `61`, `62` | task log and summary output | not started |
| 70 | Validate on a real repo | `71`, `72` | end-to-end runtime behavior | not started |

## Execution Model Mapping

The actual runtime system is still centered on this execution pipeline from `./prodify-agent/AGENTS.md`:

`01-understand -> 02-diagnose -> 03-architecture -> 04-plan -> 05-refactor -> 06-validate`

Primary runtime artifacts currently expected by that system:

- `orientation_map.md`
- `diagnostic_report.md`
- `architecture_spec.md`
- `refactor_plan.md`
- `implementation_summary.md`
- `validation_report.md`
- `run_state.json`
- `task_log.json`

The repo-level planning phases are therefore not runtime phases themselves. They are implementation phases for building or tightening the runtime system.

## Mismatches

### 1. Missing Planning Source

Task `41-map-phases-to-plan` declares `planning.md` as a required input, but `./planning.md` does not exist.

Impact:

- there is no single canonical planning document to align against
- the effective planning model is being inferred from task files and design artifacts instead

### 2. Ambiguous `.agent` Root

The repo-level task brief refers to `.agent/tasks/` and `.agent/artifacts/` generically, but the executable runtime system lives under `./prodify-agent/.agent/`, while the repo-level workflow framework lives under `./.agent/`.

Impact:

- task instructions can be read against the wrong `.agent` tree
- planning outputs and runtime outputs can be confused

### 3. Roadmap Tasks And Runtime Tasks Are Not Explicitly Linked

The repo-level roadmap defines implementation tasks through `72-validate-improvements`, but `./prodify-agent/AGENTS.md` only documents the runtime execution pipeline `01` through `06`.

Impact:

- the plan does not explicitly state that Tasks `11-72` are framework-building tasks and Tasks `01-06` are the runtime tasks the framework will eventually execute
- future work can blur design-time and run-time responsibilities

### 4. Runtime Contract Lags Behind New Design Artifacts

Tasks `21-33` produced design documents for run-state logic, task dispatch, artifact validation, step selection, loop control, and completed-step tracking. Those behaviors are not yet reflected in `./prodify-agent/AGENTS.md`.

Impact:

- the active runtime contract remains underspecified relative to the newer design set
- later implementation tasks will have to choose between the old runtime contract and the newer design docs unless the planning model names the source of truth

### 5. Loop Semantics Conflict Across Sources

`./prodify-agent/AGENTS.md` currently says:

- FAIL -> next step MUST execute
- PASS -> STOP

But the newer loop and state designs define:

- PASS -> select the next remaining step or stop if none remain
- FAIL -> retry or repair the same selected step before continuing

Impact:

- next-step resolution is currently ambiguous
- Task `42-add-next-step-resolver` cannot be implemented cleanly until one loop model is declared canonical

### 6. Artifact Location Assumptions Differ By Layer

The repo-level task brief for Task `41` writes to `.agent/artifacts/planning-alignment-report.md`, but the actual execution/design artifacts for this initiative are being written under `./prodify-agent/.agent/artifacts/`. The repo-level `.agent/artifacts/` currently contains only the earlier task-header audit.

Impact:

- artifact placement is inconsistent unless the plan explicitly distinguishes framework artifacts from runtime artifacts

## Exact Recommendations

### Recommendation 1

Create `./planning.md` as the canonical roadmap index for this initiative.

It should define:

- the purpose of the repo-level task bands
- the intended phase order
- the distinction between framework-building tasks and runtime execution tasks
- which artifact tree each phase writes to

### Recommendation 2

Document the two-layer model explicitly in `./planning.md`:

- `./.agent/` = repo-level workflow, review, verification, and meta-task tracking
- `./prodify-agent/.agent/` = runtime task system, templates, runtime artifacts, and runtime state

This removes the current ambiguity around generic `.agent/...` references.

### Recommendation 3

Add an explicit mapping section in `./planning.md` from roadmap task bands to runtime concerns:

- `10` = task/header/template contract hardening
- `20` = run-state, dispatch, and artifact validation
- `30` = refactor-loop control
- `40` = planning and next-step resolution
- `50` = CLI/status surface
- `60` = reporting
- `70` = end-to-end validation

### Recommendation 4

Before or during Task `42-add-next-step-resolver`, choose and document one canonical loop model.

Preferred choice:

- PASS advances to the next remaining step or completes the run
- FAIL retries or blocks on the same selected step

That choice matches the newer design artifacts and supports deterministic completed-step tracking.

### Recommendation 5

Treat `./prodify-agent/AGENTS.md` as the current runtime enforcement document, but do not treat it as complete until its loop/state semantics are reconciled with the design artifacts from Tasks `21-33`.

### Recommendation 6

Adopt an explicit artifact-placement rule in the planning document:

- repo-level workflow artifacts stay under `./.agent/tasks/<task-name>/`
- runtime system design and execution artifacts stay under `./prodify-agent/.agent/artifacts/`

## Recommended Source-Of-Truth Model

Until the plan is formalized, the least ambiguous source-of-truth stack is:

1. `./.agent/tasks/*.md` for roadmap order and meta-task intent
2. `./prodify-agent/AGENTS.md` for currently enforced runtime rules
3. `./prodify-agent/.agent/artifacts/*-design.md` for planned runtime evolution

This is workable, but it is not fully aligned. A root `planning.md` should consolidate the model before more downstream planning tasks depend on it.

## Conclusion

The planning and execution model are only partially aligned today. The roadmap order is clear, but the canonical planning document is missing, the `.agent` root is ambiguous across two layers, and the runtime loop semantics conflict between `AGENTS.md` and the newer design artifacts. These gaps should be resolved before implementing next-step resolution and operator-facing execution controls.
