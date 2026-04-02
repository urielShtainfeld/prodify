---
task_id: 02-diagnose
reads:
  - .prodify/artifacts/01-understand.md
writes:
  - .prodify/artifacts/02-diagnose.md
next_task: 03-architecture
mode: analysis
---
# Task 02 — Diagnose: Health and Risk Assessment

## Goal
Detect technical debt, architectural erosion, and reliability risks.

## Scope
Review the repository areas mapped in Task 01 and produce a concrete diagnostic snapshot without modifying source code.

## Inputs
- `.prodify/artifacts/01-understand.md`
- read access to the mapped modules and entrypoints

## Execution Instructions
1. **Target selection**
   - Prioritize core modules identified in Task 01.
   - Focus first on high-centrality modules, entry points, and shared infrastructure.

2. **Structural audit**
   - Detect circular dependencies or import cycles.
   - Detect mixed concerns, such as:
     - SQL inside view or UI files
     - business logic inside controllers or routes
     - infrastructure details leaking into domain logic

3. **Code smell detection**
   - Identify functions longer than 50 lines.
   - Identify files longer than 500 lines.
   - Call out excessive branching, duplicated logic, and naming inconsistency when clearly supported.

4. **Reliability check**
   - Find I/O operations lacking explicit error handling.
   - Look for missing `try/catch`, missing result handling, or unsafe fall-through behavior.
   - Highlight unvalidated input at critical boundaries.

5. **Vibe signal check**
   - Detect dense clusters of `TODO`, `FIXME`, or `HACK`.
   - Detect unreachable code, obviously dead code, or abandoned stubs.
   - Note inconsistent naming or contradictory patterns across similar modules.

6. **Severity discipline**
   - Only elevate issues to critical when they materially affect correctness, operability, or architectural integrity.
   - Prefer signal over noise.
   - MUST NOT modify source code.

## Output Specification
Use `.prodify/templates/02-diagnose.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Failure Conditions
- MUST STOP if `.prodify/artifacts/01-understand.md` is missing.
- MUST STOP if the mapped repository areas cannot be inspected.
- MUST STOP if the output cannot be produced in `.prodify/templates/02-diagnose.template.md`.
- MUST NOT modify source code.

## Definition of Done
- The codebase has a concrete health snapshot.
- Critical issues are tied to specific files.
- Reliability risks are explicitly listed.
- No fixes or refactors are proposed yet.
