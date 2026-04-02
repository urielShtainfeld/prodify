# 05-refactor

## Behavior Guardrails
- Kept the change set inside the three test files declared by `step-03-strengthen-consistency-tests`.
- Added assertions only for already-documented behavior and did not introduce new product features or CLI semantics.
- Reused existing integration and unit suites instead of creating broad new fixtures.
- After the first validation failure, repaired the same selected step by aligning one regex with the documented `repository-local` wording.

## Changed Files
- tests/integration/cli-flows.test.js
- tests/unit/self-hosted-workspace.test.js
- tests/unit/preset-loader.test.js

## Policy Checks
- Execute exactly one selected step.
- Keep the diff minimal and behavior-preserving unless the plan says otherwise.

## Selected Step
- Step ID: step-03-strengthen-consistency-tests
- Description: add explicit tests that the documented default lifecycle remains `.prodify`-first, that the preset and repo-root self-hosted workspace are distinguished correctly, and that root-level product-owned agent files are not required.

## Success Criteria
- The selected plan step is implemented fully.
- Unrelated files remain untouched.
