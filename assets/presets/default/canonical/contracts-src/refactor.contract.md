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
minimum_files_modified: 1
minimum_lines_changed: 10
must_create_files: false
required_structural_changes:
  - module-boundary-created
enforce_plan_units: true
policy_rules:
  - Execute exactly one selected step.
  - Keep the diff minimal and behavior-preserving unless the plan says otherwise.
success_criteria:
  - The selected plan step is implemented fully.
  - Unrelated files remain untouched.
  - The refactor introduces measurable structural improvement.
skill_routing:
  default_skills:
    - refactoring-method
    - test-hardening
  allowed_skills:
    - react-frontend
    - refactoring-method
    - test-hardening
    - typescript-backend
  conditional_skills:
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
# Refactor Contract

Use this contract to record the single plan step executed, the files changed, and the guardrails that preserved behavior.
