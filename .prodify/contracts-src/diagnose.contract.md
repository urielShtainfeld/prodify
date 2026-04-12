---
schema_version: 1
contract_version: 1.0.0
stage: diagnose
task_id: 02-diagnose
required_artifacts:
  - path: .prodify/artifacts/02-diagnose.md
    format: markdown
    required_sections:
      - Constraints
      - Observed Issues
      - Prioritized Hotspots
      - Policy Checks
      - Root Causes
      - Success Criteria
allowed_write_roots:
  - .prodify/artifacts/
forbidden_writes:
  - src/
  - tests/
policy_rules:
  - Diagnose from repository evidence only.
  - Do not propose implementation changes in the diagnosis stage.
success_criteria:
  - Every critical issue is tied to evidence.
  - High-value hotspots are prioritized explicitly.
  - Root causes are separated from symptoms.
---
# Diagnose Contract

Use this contract to record observed problems, supporting evidence, and the most likely root causes.
