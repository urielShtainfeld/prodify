import test from 'node:test';
import assert from 'node:assert/strict';

import { LEGACY_TARGET_REGISTRY, RUNTIME_PROFILES, listRuntimeProfiles } from '../../dist/core/targets.js';

test('runtime profiles expose all supported agents and bootstrap prompts', () => {
  assert.deepEqual(Object.keys(RUNTIME_PROFILES).sort(), ['claude', 'codex', 'copilot', 'opencode']);

  for (const profile of listRuntimeProfiles()) {
    assert.match(profile.bootstrapPrompt, /\.prodify\/AGENTS\.md/);
    assert.equal(profile.resumeCommand, '$prodify-resume');
  }
});

test('legacy target registry remains available but secondary', () => {
  assert.deepEqual(Object.keys(LEGACY_TARGET_REGISTRY).sort(), ['claude', 'codex', 'copilot', 'opencode']);

  for (const target of Object.values(LEGACY_TARGET_REGISTRY)) {
    assert.equal(typeof target.targetPath, 'string');
    assert.ok(Array.isArray(target.canonicalSources));
    assert.equal(target.enabled, true);
    assert.equal(typeof target.generator, 'function');
  }
});
