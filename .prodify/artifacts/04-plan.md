# 04-plan

## Policy Checks
- Keep the plan deterministic and minimal.
- Map every step back to a diagnosed issue or architecture rule.

## Risks
- `step-01-clarify-default-lifecycle-docs`: medium risk because multiple visible entrypoints must stay internally consistent while preserving the current `.prodify`-first product behavior.
- `step-02-reframe-compatibility-docs`: medium risk because historical design docs still describe generated root-level compatibility files and need clear scope boundaries rather than accidental deletion of future design intent.
- `step-03-strengthen-consistency-tests`: low risk because the changes are additive but they must avoid asserting behavior the product does not currently implement.

## Step Breakdown
- Step ID: step-01-clarify-default-lifecycle-docs
  - Description: clarify the current product story in canonical user-facing docs and contributor-facing guidance, including what the checked-in self-hosted `.prodify/` workspace and root `AGENTS.md` represent.
  - Files: README.md, AGENTS.md, .prodify/AGENTS.md, .prodify/artifacts/README.md, docs/canonical-prodify-layout.md
  - Risk: 3
  - Validation: npm test
- Step ID: step-02-reframe-compatibility-docs
  - Description: rewrite or relabel compatibility-target documentation so root-level generated agent files are clearly future, planned, or non-default rather than part of the current Prodify lifecycle.
  - Files: docs/compatibility-targets.md, docs/codex-support.md, docs/claude-support.md, docs/opencode-support.md, docs/generation-rules.md
  - Risk: 3
  - Validation: npm test
- Step ID: step-03-strengthen-consistency-tests
  - Description: add explicit tests that the documented default lifecycle remains `.prodify`-first, that the preset and repo-root self-hosted workspace are distinguished correctly, and that root-level product-owned agent files are not required.
  - Files: tests/integration/cli-flows.test.js, tests/unit/self-hosted-workspace.test.js, tests/unit/preset-loader.test.js
  - Risk: 1
  - Validation: npm test

## Success Criteria
- The plan enumerates executable steps.
- Verification is defined before refactoring starts.

## Verification
- Run `npm test` after each step because the touched files span docs, preset assets, and runtime-adjacent consistency tests.
- Treat any regression in lifecycle messaging, preset loading, or workspace health assertions as a blocker before advancing to the next step.
