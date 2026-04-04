---
schema_version: 1
contract_version: 1.0.0
stage: architecture
task_id: 03-architecture
required_artifacts:
  - path: .prodify/artifacts/03-architecture.md
    format: markdown
    required_sections:
      - Dependency Rules
      - Policy Checks
      - Proposed Structure
      - Success Criteria
      - Tradeoffs
allowed_write_roots:
  - .prodify/artifacts/
forbidden_writes:
  - src/
  - tests/
policy_rules:
  - Flag mixed concerns explicitly.
  - Keep Domain dependencies pointing inward only.
success_criteria:
  - The target structure is explicit.
  - Architecture violations are listed clearly.
skill_routing:
  default_skills:
    - architecture-method
  allowed_skills:
    - architecture-method
    - maintainability-review
    - react-frontend
    - typescript-backend
  conditional_skills:
    - skill: maintainability-review
      when:
        all:
          - fact: architecture_pattern
            includes: contract-driven-runtime
      reason: contract-driven runtime boundaries need maintainability review
    - skill: react-frontend
      when:
        all:
          - fact: framework
            includes: react
      reason: repo framework includes React
    - skill: typescript-backend
      when:
        all:
          - fact: language
            includes: typescript
      reason: repo language includes TypeScript
---
# Architecture Contract

Use this contract to define the target structure, dependency rules, and major tradeoffs before planning.
