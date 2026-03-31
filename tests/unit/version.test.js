import test from 'node:test';
import assert from 'node:assert/strict';

import { createVersionMetadata, parseVersionMetadata, serializeVersionMetadata } from '../../dist/presets/version.js';

test('version metadata serializes and parses correctly', () => {
  const presetMetadata = {
    name: 'default',
    version: '3.0.0',
    schemaVersion: '3'
  };

  assert.deepEqual(createVersionMetadata(presetMetadata), {
    schema_version: '3',
    preset_name: 'default',
    preset_version: '3.0.0'
  });

  assert.deepEqual(parseVersionMetadata(serializeVersionMetadata(presetMetadata)), {
    schemaVersion: '3',
    presetName: 'default',
    presetVersion: '3.0.0'
  });
});
