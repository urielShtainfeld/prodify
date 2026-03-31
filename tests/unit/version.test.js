import test from 'node:test';
import assert from 'node:assert/strict';

import { createVersionMetadata, parseVersionMetadata, serializeVersionMetadata } from '../../src/presets/version.js';

test('version metadata serializes and parses correctly', () => {
  const presetMetadata = {
    name: 'default',
    version: '2.0.0',
    schemaVersion: '2'
  };

  assert.deepEqual(createVersionMetadata(presetMetadata), {
    schema_version: '2',
    preset_name: 'default',
    preset_version: '2.0.0'
  });

  assert.deepEqual(parseVersionMetadata(serializeVersionMetadata(presetMetadata)), {
    schemaVersion: '2',
    presetName: 'default',
    presetVersion: '2.0.0'
  });
});
