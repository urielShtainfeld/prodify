import test from 'node:test';
import assert from 'node:assert/strict';

import { compileContractSource, serializeCompiledContract } from '../../dist/contracts/compiler.js';

const validSource = `---
schema_version: 1
contract_version: 1.0.0
stage: understand
task_id: 01-understand
required_artifacts:
  - path: .prodify/artifacts/01-understand.md
    format: markdown
    required_sections:
      - Policy Checks
      - Repository Summary
      - Success Criteria
allowed_write_roots:
  - .prodify/artifacts/
forbidden_writes:
  - src/
policy_rules:
  - Operate only on verified data.
success_criteria:
  - The repository intent is captured clearly.
---
# Understand

Human-readable rationale lives here.
`;

test('valid Markdown source contracts compile deterministically to strict runtime JSON', () => {
  const contract = compileContractSource({
    markdown: validSource,
    sourcePath: '.prodify/contracts-src/understand.contract.md'
  });

  assert.equal(contract.stage, 'understand');
  assert.equal(contract.task_id, '01-understand');
  assert.equal(contract.required_artifacts.length, 1);
  assert.equal(contract.required_artifacts[0].format, 'markdown');
  assert.equal(
    serializeCompiledContract(contract),
    serializeCompiledContract(compileContractSource({
      markdown: validSource,
      sourcePath: '.prodify/contracts-src/understand.contract.md'
    }))
  );
});

test('invalid frontmatter fails with a precise contract error', () => {
  const invalidSource = validSource.replace('task_id: 01-understand', 'task_id: 02-diagnose');

  assert.throws(
    () => compileContractSource({
      markdown: invalidSource,
      sourcePath: '.prodify/contracts-src/understand.contract.md'
    }),
    /does not match stage/
  );
});
