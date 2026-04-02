# AGENTS.md

Repository note: this root file exists for contributors working on the Prodify source repository. It is not created or required by Prodify's default product lifecycle. The product runtime entrypoint remains `.prodify/AGENTS.md`.

## 1. Purpose

This system defines a **deterministic execution protocol** for evolving a codebase to production-grade quality.

All behavior MUST follow this document.
If any rule cannot be satisfied, execution MUST stop.

---

## 2. Execution Model

Execution is **state-driven** and **artifact-driven**.

* State source: `.prodify/artifacts/run_state.json`
* Outputs: `.prodify/artifacts/*.md`
* Tasks: `.prodify/tasks/*.md`
* Templates: `.prodify/templates/*.md`
* Active stage artifacts use the numbered runtime filenames `01-understand.md` through `06-validate.md`

No implicit state is allowed.

---

## 3. Mandatory Task Pipeline

Tasks MUST execute in this exact order:

```text
01-understand → 02-diagnose → 03-architecture → 04-plan → 05-refactor → 06-validate
```

### Violations

Execution MUST stop if:

* a task is skipped
* a required artifact is missing
* a task is executed out of order

---

## 4. Artifact Contract

### 4.1 General Rules

* Every task MUST:

  * read declared inputs
  * write exactly one primary artifact
* All artifacts MUST:

  * exist in `.prodify/artifacts/`
  * follow the matching template exactly
  * contain all required sections

### 4.2 Validation

An artifact is INVALID if:

* a required section is missing
* section structure deviates from template
* content is empty without justification

If artifact is invalid:

* DO NOT continue
* mark task as failed

---

## 5. Task Execution Protocol

For every task:

### Step 1 — Input Verification

* Verify all declared input artifacts exist
* If missing → STOP

### Step 2 — Load Context

* Load artifacts
* Extract only relevant structured data

### Step 3 — Execute Task

* Follow task instructions exactly
* No deviation allowed

### Step 4 — Output Write

* Write artifact using template
* Do not add extra sections

### Step 5 — Output Validation

* Compare artifact to template
* If mismatch → FAIL

### Step 6 — State Update

* Update `run_state.json`
* Append to `task_log.json`

---

## 6. Refactor Constraints (Task 05)

### 6.1 Scope

* EXACTLY ONE step from `04-plan.md`
* NO additional changes allowed

### 6.2 Violations

Execution MUST stop if:

* multiple steps are executed
* unrelated files are modified
* behavior changes without being specified

---

## 7. Validation Enforcement (Task 06)

Task 06 MUST run after EVERY Task 05 execution.

### 7.1 Fail Conditions

Validation FAIL if:

* any critical issue exists
* regression detected
* architecture rules violated

### 7.2 Pass Conditions

Validation PASS only if:

* no critical issues
* no regressions
* structure improved

---

## 8. Loop Control

Execution loop:

```text
05-refactor → 06-validate → decision
```

### Rules

* If FAIL → retry or repair the same selected step before continuing
* If PASS → continue only if more steps remain; otherwise STOP
* If no steps remain → STOP

---

## 9. Prohibited Behavior

The following are STRICTLY FORBIDDEN:

* modifying code outside Task 05
* skipping validation
* generating artifacts without templates
* adding undocumented fields
* assuming file existence without verification
* performing bulk rewrites
* making implicit decisions

Violation → IMMEDIATE STOP

---

## 10. Required Behavior

The system MUST:

* use relative paths only
* produce minimal diffs
* preserve behavior unless explicitly required
* justify all non-trivial decisions
* operate only on verified data

---

## 11. Data Integrity Rules

* Artifacts are the ONLY source of truth
* Do not rely on memory across tasks
* Do not infer missing data
* If data is incomplete → STOP

---

## 12. Output Contract (MANDATORY)

Every response MUST include:

* task_id
* inputs
* actions performed
* artifact written
* code_modified: yes/no
* next_task

Missing fields → INVALID RESPONSE

---

## 13. Failure Protocol

If any rule is violated:

1. STOP execution
2. Do NOT proceed
3. Return:

```text
STATE_BLOCK:
status: failed
task_id: <task>
reason: <exact failure>
blocking_artifact: <artifact or file>
```

---

## 14. State Model

`run_state.json` MUST include:

* current_task
* last_completed_task
* next_task
* completed_step_ids
* status

If state is inconsistent → STOP

---

## 15. Determinism Requirements

Given the same:

* repository
* artifacts
* templates

The system MUST produce identical outputs.

Non-deterministic behavior is a violation.

---

## 16. Architecture Rules

* Dependencies MUST NOT point outward from Domain
* Mixed concerns MUST be flagged
* Violations MUST be explicitly listed

---

## 17. Completion Criteria

Execution is complete ONLY when:

* all required artifacts exist
* validation passes
* no remaining critical issues
* no pending refactor steps

---

## 18. Enforcement Priority

If rules conflict, priority is:

```text
1. Artifact Contract
2. Task Order
3. Refactor Constraints
4. Validation Rules
5. Output Contract
```

Higher priority rules override lower ones.

---

## 19. Zero-Assumption Policy

* Never assume structure
* Never assume intent
* Never assume correctness

Everything MUST be verified.
