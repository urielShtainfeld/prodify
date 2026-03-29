---
task_id: 01-understand
reads: []
writes:
  - .prodify/artifacts/orientation_map.md
next_task: 02-diagnose
mode: analysis
---
# Task 01 — Understand: Repository Architectural Orientation

## Goal
Transform a raw repository into a machine-parseable architectural map.

## Scope
Survey the repository structure conservatively and produce an evidence-based orientation artifact without modifying source code.

## Inputs
- Absolute path to repository root

## Execution Instructions
1. **Scan boundaries**
   - Execute a shallow scan of the repository first.
   - Read `.gitignore` to establish the scope of valid source files.
   - Exclude generated, vendored, cache, and build-output directories unless explicitly needed.

2. **Tech stack detection**
   - Locate ecosystem marker files such as:
     - `package.json`
     - `pyproject.toml`
     - `go.mod`
     - `Cargo.toml`
     - `*.csproj`
     - `pom.xml`
   - Infer primary languages, frameworks, package managers, and runtime environment.

3. **Entry point discovery**
   - Search for standard startup patterns such as:
     - `main.ts`, `index.ts`
     - `app.py`, `main.py`
     - `Program.cs`
     - framework-specific bootstraps
   - Record all likely entry points, and label confidence when ambiguous.

4. **Monorepo identification**
   - Check for markers such as:
     - `nx.json`
     - `turbo.json`
     - `pnpm-workspace.yaml`
     - `lerna.json`
     - workspace definitions in root manifests
   - If found, recursively map sub-projects and package boundaries.

5. **Module mapping**
   - Identify high-internal-cohesion directories such as:
     - `src/services`
     - `lib/core`
     - `apps/*`
     - `packages/*`
   - For each major module, infer:
     - purpose
     - responsibility
     - approximate boundary

6. **Output discipline**
   - Be conservative.
   - Do not invent structure that is not supported by repository evidence.
   - Mark uncertainty explicitly.
   - MUST NOT modify source code.

## Output Specification
Use `.prodify/templates/orientation_map.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Failure Conditions
- MUST STOP if the repository root cannot be read.
- MUST STOP if required repository evidence cannot be inspected safely.
- MUST STOP if the output cannot be produced in `.prodify/templates/orientation_map.template.md`.
- MUST NOT modify source code.

## Definition of Done
- The repository has a clear, evidence-based orientation map.
- Likely entry points are identified.
- Major modules and monorepo boundaries are captured.
- No code changes are made.
