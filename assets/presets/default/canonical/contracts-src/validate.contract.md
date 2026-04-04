---
schema_version: 1
contract_version: 1.0.0
stage: validate
task_id: 06-validate
required_artifacts:
  - path: .prodify/artifacts/06-validate.md
    format: markdown
    required_sections:
      - Policy Checks
      - Regressions
      - Success Criteria
      - Validation Results
  - path: .prodify/state.json
    format: json
    required_json_keys:
      - preset_name
      - preset_version
      - runtime
      - schema_version
allowed_write_roots:
  - .prodify/artifacts/
  - .prodify/metrics/
forbidden_writes:
  - src/
policy_rules:
  - Validation must follow every refactor step.
  - Critical regressions block forward progress.
success_criteria:
  - Validation records whether regressions were found.
  - The result is strong enough to gate the next runtime transition.
skill_routing:
  default_skills:
    - test-hardening
    - validation-method
  allowed_skills:
    - react-frontend
    - security-hardening
    - test-hardening
    - typescript-backend
    - validation-method
  conditional_skills:
    - skill: react-frontend
      when:
        all:
          - fact: framework
            includes: react
      reason: repo framework includes React
    - skill: security-hardening
      when:
        all:
          - fact: risk_signal
            includes: external-dependencies
      reason: repo carries external dependency risk
    - skill: typescript-backend
      when:
        all:
          - fact: language
            includes: typescript
      reason: repo language includes TypeScript
---
# Validate Contract

Use this contract to record validation evidence, regression status, and final readiness for the next state transition.
