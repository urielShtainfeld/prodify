---
task_id: 03-architecture
reads:
  - .agent/artifacts/orientation_map.md
  - .agent/artifacts/diagnostic_report.md
writes:
  - .agent/artifacts/architecture_spec.md
next_task: 04-plan
mode: analysis
---
# Task 03 — Architecture: Strategic Alignment

## Identity & Mandate
**Goal:** Define the North Star target architecture and identify structural gaps.  
**Role:** `@Principal-Architect`  
**Problem:** Lack of structural intent in evolved legacy systems.

## Data Contract
**Input:** `orientation_map.md` plus `diagnostic_report.md`  
**Output:** `architecture_spec.md`

## Execution Instructions (SOP)
1. **Pattern detection**
   - Classify the current architecture style as one of:
     - Layered
     - MVC
     - Hexagonal / Clean
     - Vibe Architecture
   - Include a confidence score from `0.0` to `1.0`.

2. **North Star design**
   - Define a target **Modular Clean Architecture** composed of four layers:
     - Domain
     - Application
     - Infrastructure
     - Interface
   - Tailor the recommendation to the actual tech stack and project type.

3. **Dependency mapping**
   - Mandate that dependencies point inward toward the Domain.
   - Explicitly define which layers may depend on which.

4. **Gap analysis**
   - Identify places where:
     - dependencies point outward
     - layers are skipped
     - responsibilities are mixed
     - modules violate boundary expectations

5. **Decision quality**
   - Be opinionated, but ground all decisions in repository evidence.
   - Do not choose a target style that the project cannot reasonably evolve toward.

## Output Specification
Use `.agent/templates/architecture_spec.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Definition of Done
- The current architecture is classified with confidence.
- The target architecture is clearly defined.
- Dependency rules are explicit.
- Structural violations are listed with concrete locations.
