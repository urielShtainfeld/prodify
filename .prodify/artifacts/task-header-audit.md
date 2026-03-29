# Task Header Audit

Date: 2026-03-28
Scope: `./.prodify/tasks/*.md`

## Files Checked
- `./.prodify/tasks/01-understand.md`
- `./.prodify/tasks/02-diagnose.md`
- `./.prodify/tasks/03-architecture.md`
- `./.prodify/tasks/04-plan.md`
- `./.prodify/tasks/05-refactor.md`
- `./.prodify/tasks/06-validate.md`

## Required Header Fields
Expected frontmatter keys, in order:
1. `task_id`
2. `reads`
3. `writes`
4. `next_task`
5. `mode`

## Findings
- All 6 task files include the required header keys.
- All 6 task files already use the expected key order.
- 5 of 6 task files already used valid list formatting for `reads` and `writes`.
- `./.prodify/tasks/01-understand.md` used `reads:` with no value, which parsed as `null` rather than an empty list.

## Missing Fields
- None.

## Normalization Changes Needed
- `./.prodify/tasks/01-understand.md`
  Changed `reads:` to `reads: []` so the field is explicitly an empty list and matches the intended metadata contract.

## Recommended Fixes
- Keep `reads` and `writes` typed as lists in every task file, including explicit empty lists where applicable.
- Preserve the existing key order: `task_id`, `reads`, `writes`, `next_task`, `mode`.
- If future task files are added, validate frontmatter shape before committing them so `null` values do not slip in for list fields.

## Result
- Task headers are now standardized across the audited task set.
- No additional header fixes are currently needed in `./.prodify/tasks/`.
