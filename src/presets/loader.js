import fs from 'node:fs/promises';
import path from 'node:path';

import { listFilesRecursive } from '../core/fs.js';
import { validatePresetEntries } from '../core/preset-validation.js';
import { DEFAULT_PRESET_ASSET_DIR } from './default.js';
import { serializeVersionMetadata } from './version.js';

export async function loadDefaultPreset() {
  const metadataPath = path.join(DEFAULT_PRESET_ASSET_DIR, 'preset.json');
  const canonicalDir = path.join(DEFAULT_PRESET_ASSET_DIR, 'canonical');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const rawFiles = await listFilesRecursive(canonicalDir);

  const entries = [];

  for (const file of rawFiles) {
    entries.push({
      relativePath: `.prodify/${file.relativePath}`,
      content: await fs.readFile(file.fullPath, 'utf8')
    });
  }

  entries.push({
    relativePath: '.prodify/version.json',
    content: serializeVersionMetadata(metadata)
  });

  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  validatePresetEntries(entries);

  return {
    metadata,
    entries
  };
}
