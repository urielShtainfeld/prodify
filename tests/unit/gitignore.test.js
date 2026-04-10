import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { syncProdifyGitignore } from '../../dist/core/gitignore.js';
import { createTempRepo } from './helpers.js';

test('gitignore manager creates a selective managed block without hiding source inputs', async () => {
  const repoRoot = await createTempRepo();

  const result = await syncProdifyGitignore(repoRoot);
  const content = await fs.readFile(path.join(repoRoot, '.gitignore'), 'utf8');

  assert.equal(result.created, true);
  assert.match(content, /# BEGIN PRODIFY GENERATED/);
  assert.match(content, /\.prodify\/contracts\//);
  assert.match(content, /\.prodify\/runtime\//);
  assert.match(content, /\.prodify\/artifacts\//);
  assert.match(content, /\.prodify\/metrics\//);
  assert.match(content, /\.prodify\/state\.json/);
  assert.doesNotMatch(content, /^\.prodify\/$/m);
  assert.doesNotMatch(content, /^\.prodify$/m);
});

test('gitignore manager preserves user rules, repairs blanket ignores, and stays idempotent', async () => {
  const repoRoot = await createTempRepo();
  const gitignorePath = path.join(repoRoot, '.gitignore');
  await fs.writeFile(gitignorePath, ['node_modules/', '.prodify/', '', '# custom', 'dist/'].join('\n'), 'utf8');

  const first = await syncProdifyGitignore(repoRoot);
  const afterFirst = await fs.readFile(gitignorePath, 'utf8');
  const second = await syncProdifyGitignore(repoRoot);
  const afterSecond = await fs.readFile(gitignorePath, 'utf8');

  assert.match(afterFirst, /^node_modules\/$/m);
  assert.match(afterFirst, /^dist\/$/m);
  assert.doesNotMatch(afterFirst, /^\.prodify\/$/m);
  assert.match(afterFirst, /# BEGIN PRODIFY GENERATED/);
  assert.match(first.warnings.join('\n'), /blanket `\.prodify\/` ignore/i);
  assert.equal(afterSecond, afterFirst);
  assert.equal(second.updated, false);
});
