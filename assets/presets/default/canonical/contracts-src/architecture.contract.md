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
---
# Architecture Contract

Use this contract to define the target structure, dependency rules, and major tradeoffs before planning.
