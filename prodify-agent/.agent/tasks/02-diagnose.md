---
task_id: 02-diagnose
reads:
  - .agent/artifacts/orientation_map.md
writes:
  - .agent/artifacts/diagnostic_report.md
next_task: 03-architecture
mode: analysis
---
# Task 02 — Diagnose: Health and Risk Assessment

## Identity & Mandate
**Goal:** Detect technical debt, architectural erosion, and reliability risks.  
**Role:** `@Security-Auditor`  
**Problem:** Work slop and rapid unstructured additions destroying integrity.

## Data Contract
**Input:** `orientation_map.md` plus read access to mapped modules.  
**Output:** `diagnostic_report.md`

## Execution Instructions (SOP)
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

## Output Specification
Use `.agent/templates/diagnostic_report.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Definition of Done
- The codebase has a concrete health snapshot.
- Critical issues are tied to specific files.
- Reliability risks are explicitly listed.
- No fixes or refactors are proposed yet.
