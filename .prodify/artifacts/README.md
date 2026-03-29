# Prodify Artifacts

This folder contains the runtime artifacts produced by the Prodify workflow.

## Coordination files
- `run_state.json` — current workflow state
- `task_log.json` — execution history

## Primary artifacts
- `orientation_map.md`
- `diagnostic_report.md`
- `architecture_spec.md`
- `refactor_plan.md`
- `implementation_summary.md`
- `validation_report.md`

## Notes
- Tasks should read and write artifacts through this folder.
- Output shapes should follow the markdown templates in `.prodify/templates/`.
- Artifacts may be regenerated when stale.
