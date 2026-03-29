# Template Usage Audit

Date: 2026-03-28
Scope: `./.prodify/tasks/*.md`

## Audit Results

| Task file | Expected artifact | Matching template | Gaps found | Exact fix recommendation |
| --- | --- | --- | --- | --- |
| `./.prodify/tasks/01-understand.md` | `.prodify/artifacts/orientation_map.md` | `.prodify/templates/orientation_map.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .prodify/templates/orientation_map.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./.prodify/tasks/02-diagnose.md` | `.prodify/artifacts/diagnostic_report.md` | `.prodify/templates/diagnostic_report.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .prodify/templates/diagnostic_report.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./.prodify/tasks/03-architecture.md` | `.prodify/artifacts/architecture_spec.md` | `.prodify/templates/architecture_spec.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .prodify/templates/architecture_spec.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./.prodify/tasks/04-plan.md` | `.prodify/artifacts/refactor_plan.md` | `.prodify/templates/refactor_plan.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .prodify/templates/refactor_plan.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./.prodify/tasks/05-refactor.md` | `.prodify/artifacts/implementation_summary.md` | `.prodify/templates/implementation_summary.template.md` | Output specification said "matching markdown template" without naming the file, even though the task also allows updated source files. | Replace the generic sentence with: `Use .prodify/templates/implementation_summary.template.md and fill every section explicitly for implementation_summary.md. Do not substitute a freeform structure for the summary artifact.` |
| `./.prodify/tasks/06-validate.md` | `.prodify/artifacts/validation_report.md` | `.prodify/templates/validation_report.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .prodify/templates/validation_report.template.md and fill every section explicitly. Do not substitute a freeform structure.` |

## Summary
- Every task now has a clear one-to-one mapping from output artifact to template file.
- The ambiguity was consistent across all six task files and has been corrected.
- No additional template-usage gaps were found in the current task set.
