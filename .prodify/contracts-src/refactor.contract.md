---
schema_version: 1
contract_version: 1.0.0
stage: refactor
task_id: 05-refactor
required_artifacts:
  - path: .prodify/artifacts/05-refactor.md
    format: markdown
    required_sections:
      - Behavior Guardrails
      - Changed Files
      - Policy Checks
      - Selected Step
      - Success Criteria
allowed_write_roots:
  - .prodify/artifacts/
  - README.md
  - assets/
  - src/
  - tests/
forbidden_writes:
  - .prodify/contracts/
policy_rules:
  - Execute exactly one selected step.
  - Keep the diff minimal and behavior-preserving unless the plan says otherwise.
success_criteria:
  - The selected plan step is implemented fully.
  - Unrelated files remain untouched.
---
# Refactor Contract

Use this contract to record the single plan step executed, the files changed, and the guardrails that preserved behavior.
