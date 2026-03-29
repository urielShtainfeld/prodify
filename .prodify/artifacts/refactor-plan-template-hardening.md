# Refactor Plan Template Hardening

Date: 2026-03-29
Task: `83-harden-refactor-plan-template`

## Problems In Current Template

The current template is too loose for deterministic parsing because:

- the step heading is placeholder-style rather than a fixed repeated structure
- no per-step status field exists
- the template does not strongly distinguish one step block from the next
- step IDs are not normalized into an execution-friendly repeated pattern

## Exact Revised Template Structure

Use this fixed repeated step structure:

```md
# Refactor Plan

## Summary
- Total phases:
- Total steps:
- Estimated complexity:

## Phase Breakdown
- Phase:
  - Goal:
  - Notes:

## Steps

### Step: <ID>
- Status: pending
- Description:
- Files:
- Risk:
- Expected outcome:
- Validation command:

### Step: <ID>
- Status: pending
- Description:
- Files:
- Risk:
- Expected outcome:
- Validation command:

## Notes
- 
```

## Parsing Benefits

This structure improves parsing because:

- every step starts with the exact `### Step:` marker
- every step includes the same required fields in the same order
- `Status` gives the runtime an explicit place for step-state tracking
- automatic selection can key off stable step IDs instead of freeform headings

## Compatibility Notes For Task 04

Task `04-plan` should:

- emit one repeated step block per planned step
- assign a stable step ID to every step
- default every new step to `Status: pending`
- keep `Files`, `Risk`, `Expected outcome`, and `Validation command` populated for every step

## Compatibility Notes For Task 05

Task `05-refactor` should:

- resolve the selected step from the fixed `### Step: <ID>` heading
- require exactly one step block to be active per execution attempt
- treat missing or malformed repeated fields as a stop condition

## Result
- A stricter step format is defined.
- The format supports automatic step resolution and completed-step tracking.
- The template remains human-readable and markdown-based.
