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
