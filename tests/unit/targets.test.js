import test from 'node:test';
import assert from 'node:assert/strict';

import { RUNTIME_PROFILES, listRuntimeProfiles } from '../../dist/core/targets.js';

test('runtime profiles expose all supported agents and bootstrap prompts', () => {
  assert.deepEqual(Object.keys(RUNTIME_PROFILES).sort(), ['claude', 'codex', 'copilot', 'opencode']);

  for (const profile of listRuntimeProfiles()) {
    assert.match(profile.bootstrapPrompt, /\.prodify\/AGENTS\.md/);
    assert.equal(profile.resumeCommand, '$prodify-resume');
  }
});
