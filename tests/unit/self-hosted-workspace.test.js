import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { REQUIRED_CANONICAL_PATHS } from '../../dist/core/paths.js';

test('checked-in repo-root .prodify workspace contains the canonical runtime layout', async () => {
  for (const relativePath of REQUIRED_CANONICAL_PATHS) {
    await fs.access(path.join(process.cwd(), relativePath));
  }
});

test('self-hosted workspace guidance distinguishes canonical runtime files from repo-local additions', async () => {
  const artifactReadme = await fs.readFile(path.join(process.cwd(), '.prodify', 'artifacts', 'README.md'), 'utf8');
  const rootGuidance = await fs.readFile(path.join(process.cwd(), '.prodify', 'AGENTS.md'), 'utf8');

  assert.equal(REQUIRED_CANONICAL_PATHS.includes('AGENTS.md'), false);
  assert.match(artifactReadme, /numbered filenames such as `01-understand\.md` through `06-validate\.md`/);
  assert.match(artifactReadme, /repository-local design or historical artifacts/i);
  assert.match(rootGuidance, /root `AGENTS\.md`.*repository-local contributor guidance/i);
});
