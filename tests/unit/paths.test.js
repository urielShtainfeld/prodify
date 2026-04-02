import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { resolveRepoRoot } from '../../dist/core/repo-root.js';
import { resolveCanonicalPath } from '../../dist/core/paths.js';
import { createTempRepo } from './helpers.js';

test('repo root resolves from .prodify presence', async () => {
  const repoRoot = await createTempRepo();
  await fs.mkdir(path.join(repoRoot, '.prodify'));
  await fs.mkdir(path.join(repoRoot, 'nested', 'more'), { recursive: true });

  const resolved = await resolveRepoRoot({
    cwd: path.join(repoRoot, 'nested', 'more')
  });

  assert.equal(resolved, repoRoot);
});

test('repo root resolves from .git during bootstrap', async () => {
  const repoRoot = await createTempRepo();
  await fs.mkdir(path.join(repoRoot, 'nested', 'more'), { recursive: true });

  const resolved = await resolveRepoRoot({
    cwd: path.join(repoRoot, 'nested', 'more'),
    allowBootstrap: true
  });

  assert.equal(resolved, repoRoot);
});

test('canonical paths still resolve deterministically', () => {
  const repoRoot = '/tmp/example-repo';

  assert.equal(resolveCanonicalPath(repoRoot, '.prodify/AGENTS.md'), '/tmp/example-repo/.prodify/AGENTS.md');
  assert.equal(resolveCanonicalPath(repoRoot, '.prodify/contracts-src/understand.contract.md'), '/tmp/example-repo/.prodify/contracts-src/understand.contract.md');
  assert.equal(resolveCanonicalPath(repoRoot, '.prodify/contracts/understand.contract.json'), '/tmp/example-repo/.prodify/contracts/understand.contract.json');
});

test('repo root resolution fails cleanly when root is missing', async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'prodify-no-root-'));

  await assert.rejects(
    resolveRepoRoot({ cwd: repoRoot }),
    /Could not resolve repository root/
  );

  await fs.rm(repoRoot, { recursive: true, force: true });
});
