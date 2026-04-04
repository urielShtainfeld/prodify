import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDefaultPreset } from '../../dist/presets/loader.js';

test('default preset loads required canonical files', async () => {
  const preset = await loadDefaultPreset();
  const paths = preset.entries.map((entry) => entry.relativePath);

  assert.ok(paths.includes('.prodify/AGENTS.md'));
  assert.ok(paths.includes('.prodify/artifacts/README.md'));
  assert.ok(paths.includes('.prodify/contracts-src/README.md'));
  assert.ok(paths.includes('.prodify/contracts-src/understand.contract.md'));
  assert.ok(paths.includes('.prodify/contracts-src/validate.contract.md'));
  assert.ok(paths.includes('.prodify/metrics/README.md'));
  assert.ok(paths.includes('.prodify/project.md'));
  assert.ok(paths.includes('.prodify/planning.md'));
  assert.ok(paths.includes('.prodify/runtime-commands.md'));
  assert.ok(paths.includes('.prodify/skills/README.md'));
  assert.ok(paths.includes('.prodify/skills/registry.json'));
  assert.ok(paths.includes('.prodify/skills/stage-method/codebase-scanning.skill.json'));
  assert.ok(paths.includes('.prodify/state.json'));
  assert.ok(paths.includes('.prodify/version.json'));
  assert.ok(paths.includes('.prodify/tasks/README.md'));
  assert.ok(paths.includes('.prodify/rules/README.md'));
  assert.ok(paths.includes('.prodify/templates/README.md'));
  assert.equal(paths.includes('AGENTS.md'), false);
  assert.equal(paths.includes('CLAUDE.md'), false);
  assert.equal(paths.some((entry) => entry.startsWith('.github/')), false);
  assert.equal(paths.some((entry) => entry.startsWith('.opencode/')), false);
  assert.equal(paths.some((entry) => entry.startsWith('.prodify/presets/')), false);

  const stateEntry = preset.entries.find((entry) => entry.relativePath === '.prodify/state.json');
  assert.ok(stateEntry);
  assert.doesNotMatch(stateEntry.content, /primary_agent/);
  assert.doesNotMatch(stateEntry.content, /selected_agent/);
});
