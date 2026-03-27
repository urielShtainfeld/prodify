---
task_id: 01-understand
reads:
writes:
  - .agent/artifacts/orientation_map.md
next_task: 02-diagnose
mode: analysis
---
# Task 01 — Understand: Repository Architectural Orientation

## Identity & Mandate
**Goal:** Transform a raw repository into a machine-parseable architectural map.  
**Role:** `@Repository-Explorer`  
**Problem:** Context rot and attention dilution in large codebases.

## Data Contract
**Input:** Absolute path to repository root.  
**Output:** `orientation_map.md`

## Execution Instructions (SOP)
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

## Output Specification
Use the matching markdown template in `.agent/templates/` and fill every section explicitly.

## Definition of Done
- The repository has a clear, evidence-based orientation map.
- Likely entry points are identified.
- Major modules and monorepo boundaries are captured.
- No code changes are made.
