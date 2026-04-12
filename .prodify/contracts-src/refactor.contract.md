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
      - Targeted Hotspots
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
minimum_non_formatting_lines_changed: 10
must_create_files: false
forbid_cosmetic_only_changes: true
minimum_hotspots_touched: 1
required_structural_changes:
  - module-boundary-created
enforce_plan_units: true
policy_rules:
  - Execute exactly one selected step.
  - Keep the diff minimal and behavior-preserving unless the plan says otherwise.
success_criteria:
  - The selected plan step is implemented fully.
  - Targeted hotspots are addressed explicitly.
  - Unrelated files remain untouched.
  - The refactor introduces measurable structural improvement.
  - The refactor changes a high-value hotspot when hotspots are present.
---
# Refactor Contract

Use this contract to record the single plan step executed, the files changed, and the guardrails that preserved behavior.
