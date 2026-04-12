---
schema_version: 1
contract_version: 1.0.0
stage: plan
task_id: 04-plan
required_artifacts:
  - path: .prodify/artifacts/04-plan.md
    format: markdown
    required_sections:
      - Policy Checks
      - Prioritized Hotspots
      - Risks
      - Step Breakdown
      - Success Criteria
      - Verification
allowed_write_roots:
  - .prodify/artifacts/
forbidden_writes:
  - src/
  - tests/
policy_rules:
  - Keep the plan deterministic and minimal.
  - Map every step back to a diagnosed issue or architecture rule.
success_criteria:
  - High-value hotspots are mapped to execution steps.
  - The plan enumerates executable steps.
  - Verification is defined before refactoring starts.
---
# Plan Contract

Use this contract to produce the smallest safe sequence of refactor steps and verification checkpoints.
