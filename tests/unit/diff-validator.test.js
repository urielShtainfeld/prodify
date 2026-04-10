import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { captureRepoSnapshot, diffSnapshots } from '../../dist/core/diff-validator.js';
import { createTempRepo } from './helpers.js';

test('diff validator detects added modules, line changes, and structural improvements', async () => {
  const repoRoot = await createTempRepo();
  await fs.mkdir(path.join(repoRoot, 'src'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'src', 'routes.ts'), `export function routeUser() {\n  const user = loadUser();\n  return user;\n}\n`, 'utf8');

  const before = await captureRepoSnapshot(repoRoot);

  await fs.mkdir(path.join(repoRoot, 'src', 'services'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'src', 'routes.ts'), `import { loadUserService } from './services/user-service.js';\n\nexport function routeUser() {\n  return loadUserService();\n}\n`, 'utf8');
  await fs.writeFile(path.join(repoRoot, 'src', 'services', 'user-service.ts'), `export function loadUserService() {\n  return loadUser();\n}\n`, 'utf8');

  const after = await captureRepoSnapshot(repoRoot);
  const diff = diffSnapshots(before, after);

  assert.equal(diff.filesAdded, 1);
  assert.equal(diff.filesModified, 1);
  assert.match(diff.structuralChanges.structural_change_flags.join(','), /module-boundary-created/);
  assert.match(diff.structuralChanges.structural_change_flags.join(','), /responsibility-reduced/);
  assert.deepEqual(diff.structuralChanges.new_layer_directories, ['src/services']);
});
