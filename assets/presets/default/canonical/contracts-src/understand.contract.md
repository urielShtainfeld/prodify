---
schema_version: 1
contract_version: 1.0.0
stage: understand
task_id: 01-understand
required_artifacts:
  - path: .prodify/artifacts/01-understand.md
    format: markdown
    required_sections:
      - Current State
      - Open Questions
      - Policy Checks
      - Repository Summary
      - Success Criteria
allowed_write_roots:
  - .prodify/artifacts/
forbidden_writes:
  - src/
  - tests/
policy_rules:
  - Operate only on verified data.
  - Preserve the existing behavior during understanding.
success_criteria:
  - The repository intent is captured clearly.
  - Known unknowns are listed explicitly.
---
# Understand Contract

Use this contract to describe the current repository, verified constraints, and open questions before diagnosis begins.
