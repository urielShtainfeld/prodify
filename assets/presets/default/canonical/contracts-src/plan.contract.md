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
  - The plan enumerates executable steps.
  - Verification is defined before refactoring starts.
skill_routing:
  default_skills:
    - planning-method
  allowed_skills:
    - maintainability-review
    - planning-method
  conditional_skills:
    - skill: maintainability-review
      when:
        all:
          - fact: project_type
            includes: cli
      reason: CLI lifecycle changes should be reviewed for maintainability
---
# Plan Contract

Use this contract to produce the smallest safe sequence of refactor steps and verification checkpoints.
