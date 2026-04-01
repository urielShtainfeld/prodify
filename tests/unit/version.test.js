import test from 'node:test';
import assert from 'node:assert/strict';

import { createVersionMetadata, parseVersionMetadata, serializeVersionMetadata } from '../../dist/presets/version.js';

test('version metadata serializes and parses correctly', () => {
  const presetMetadata = {
    name: 'default',
    version: '4.0.0',
    schemaVersion: '4'
  };

  assert.deepEqual(createVersionMetadata(presetMetadata), {
    schema_version: '4',
    preset_name: 'default',
    preset_version: '4.0.0'
  });

  assert.deepEqual(parseVersionMetadata(serializeVersionMetadata(presetMetadata)), {
    schemaVersion: '4',
    presetName: 'default',
    presetVersion: '4.0.0'
  });
});
