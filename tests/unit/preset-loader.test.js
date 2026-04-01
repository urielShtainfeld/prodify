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
  assert.ok(paths.includes('.prodify/state.json'));
  assert.ok(paths.includes('.prodify/version.json'));
  assert.ok(paths.includes('.prodify/tasks/README.md'));
  assert.ok(paths.includes('.prodify/rules/README.md'));
  assert.ok(paths.includes('.prodify/templates/README.md'));
});
