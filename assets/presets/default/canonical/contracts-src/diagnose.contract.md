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
skill_routing:
  default_skills:
    - diagnosis-method
  allowed_skills:
    - diagnosis-method
    - maintainability-review
    - security-hardening
  conditional_skills:
    - skill: maintainability-review
      when:
        all:
          - fact: architecture_pattern
            includes: layered-cli
      reason: layered CLI ownership should be reviewed for maintainability
    - skill: security-hardening
      when:
        all:
          - fact: risk_signal
            includes: external-dependencies
      reason: repo carries external dependency risk
---
# Diagnose Contract

Use this contract to record observed problems, supporting evidence, and the most likely root causes.
