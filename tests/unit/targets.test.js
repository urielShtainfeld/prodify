import test from 'node:test';
import assert from 'node:assert/strict';

import { TARGET_REGISTRY, listRegisteredTargets } from '../../src/core/targets.js';

test('target registry exposes all implemented agents with metadata', () => {
  assert.deepEqual(Object.keys(TARGET_REGISTRY).sort(), ['claude', 'codex', 'copilot', 'opencode']);

  for (const target of listRegisteredTargets()) {
    assert.equal(typeof target.targetPath, 'string');
    assert.ok(Array.isArray(target.canonicalSources));
    assert.equal(target.enabled, true);
    assert.equal(typeof target.generator, 'function');
  }
});
