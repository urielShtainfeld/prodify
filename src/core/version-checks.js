import fs from 'node:fs/promises';

import { pathExists } from './fs.js';
import { resolveCanonicalPath } from './paths.js';
import { parseVersionMetadata } from '../presets/version.js';

export async function inspectVersionStatus(repoRoot, presetMetadata) {
  const versionPath = resolveCanonicalPath(repoRoot, '.prodify/version.json');

  if (!(await pathExists(versionPath))) {
    return {
      status: 'missing',
      current: null,
      expected: presetMetadata,
      schemaMigrationRequired: false
    };
  }

  try {
    const current = parseVersionMetadata(await fs.readFile(versionPath, 'utf8'));
    const versionMatches = current.presetName === presetMetadata.name
      && current.presetVersion === presetMetadata.version;
    const schemaMatches = current.schemaVersion === presetMetadata.schemaVersion;

    return {
      status: versionMatches && schemaMatches ? 'current' : 'outdated',
      current,
      expected: presetMetadata,
      schemaMigrationRequired: !schemaMatches
    };
  } catch {
    return {
      status: 'malformed',
      current: null,
      expected: presetMetadata,
      schemaMigrationRequired: true
    };
  }
}
