# Template Usage Audit

Date: 2026-03-28
Scope: `./prodify-agent/.agent/tasks/*.md`

## Audit Results

| Task file | Expected artifact | Matching template | Gaps found | Exact fix recommendation |
| --- | --- | --- | --- | --- |
| `./prodify-agent/.agent/tasks/01-understand.md` | `.agent/artifacts/orientation_map.md` | `.agent/templates/orientation_map.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .agent/templates/orientation_map.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./prodify-agent/.agent/tasks/02-diagnose.md` | `.agent/artifacts/diagnostic_report.md` | `.agent/templates/diagnostic_report.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .agent/templates/diagnostic_report.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./prodify-agent/.agent/tasks/03-architecture.md` | `.agent/artifacts/architecture_spec.md` | `.agent/templates/architecture_spec.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .agent/templates/architecture_spec.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./prodify-agent/.agent/tasks/04-plan.md` | `.agent/artifacts/refactor_plan.md` | `.agent/templates/refactor_plan.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .agent/templates/refactor_plan.template.md and fill every section explicitly. Do not substitute a freeform structure.` |
| `./prodify-agent/.agent/tasks/05-refactor.md` | `.agent/artifacts/implementation_summary.md` | `.agent/templates/implementation_summary.template.md` | Output specification said "matching markdown template" without naming the file, even though the task also allows updated source files. | Replace the generic sentence with: `Use .agent/templates/implementation_summary.template.md and fill every section explicitly for implementation_summary.md. Do not substitute a freeform structure for the summary artifact.` |
| `./prodify-agent/.agent/tasks/06-validate.md` | `.agent/artifacts/validation_report.md` | `.agent/templates/validation_report.template.md` | Output specification said "matching markdown template" without naming the file. | Replace the generic sentence with: `Use .agent/templates/validation_report.template.md and fill every section explicitly. Do not substitute a freeform structure.` |

## Summary
- Every task now has a clear one-to-one mapping from output artifact to template file.
- The ambiguity was consistent across all six task files and has been corrected.
- No additional template-usage gaps were found in the current task set.
