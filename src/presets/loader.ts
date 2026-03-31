import fs from 'node:fs/promises';
import path from 'node:path';

import { listFilesRecursive } from '../core/fs.js';
import { validatePresetEntries } from '../core/preset-validation.js';
import { DEFAULT_PRESET_ASSET_DIR } from './default.js';
import { serializeVersionMetadata } from './version.js';
import type { LoadedPreset, PresetEntry, VersionMetadata } from '../types.js';

export async function loadDefaultPreset(): Promise<LoadedPreset> {
  const metadataPath = path.join(DEFAULT_PRESET_ASSET_DIR, 'preset.json');
  const canonicalDir = path.join(DEFAULT_PRESET_ASSET_DIR, 'canonical');
  const rawMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as {
    name: string;
    version: string;
    schemaVersion: string;
  };
  const metadata: VersionMetadata = {
    name: rawMetadata.name,
    version: rawMetadata.version,
    schemaVersion: rawMetadata.schemaVersion
  };
  const rawFiles = await listFilesRecursive(canonicalDir);

  const entries: PresetEntry[] = [];

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
