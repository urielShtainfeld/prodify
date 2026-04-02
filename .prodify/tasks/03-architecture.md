---
task_id: 03-architecture
reads:
  - .prodify/artifacts/01-understand.md
  - .prodify/artifacts/02-diagnose.md
writes:
  - .prodify/artifacts/03-architecture.md
next_task: 04-plan
mode: analysis
---
# Task 03 — Architecture: Strategic Alignment

## Goal
Define the target architecture and identify structural gaps against the current repository.

## Scope
Use the outputs of Tasks 01 and 02 to define a grounded architecture target and explicit structural violations without modifying source code.

## Inputs
- `.prodify/artifacts/01-understand.md`
- `.prodify/artifacts/02-diagnose.md`

## Execution Instructions
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
   - MUST NOT modify source code.

## Output Specification
Use `.prodify/templates/03-architecture.template.md` and fill every section explicitly. Do not substitute a freeform structure.

## Failure Conditions
- MUST STOP if `.prodify/artifacts/01-understand.md` is missing.
- MUST STOP if `.prodify/artifacts/02-diagnose.md` is missing.
- MUST STOP if the target architecture cannot be grounded in repository evidence.
- MUST STOP if the output cannot be produced in `.prodify/templates/03-architecture.template.md`.
- MUST NOT modify source code.

## Definition of Done
- The current architecture is classified with confidence.
- The target architecture is clearly defined.
- Dependency rules are explicit.
- Structural violations are listed with concrete locations.
