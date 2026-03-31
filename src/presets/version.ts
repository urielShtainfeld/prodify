import type { ParsedVersionMetadata, VersionMetadata } from '../types.js';

export function createVersionMetadata(presetMetadata: VersionMetadata): {
  schema_version: string;
  preset_name: string;
  preset_version: string;
} {
  return {
    schema_version: presetMetadata.schemaVersion,
    preset_name: presetMetadata.name,
    preset_version: presetMetadata.version
  };
}

export function serializeVersionMetadata(presetMetadata: VersionMetadata): string {
  return `${JSON.stringify(createVersionMetadata(presetMetadata), null, 2)}\n`;
}

export function parseVersionMetadata(content: string): ParsedVersionMetadata {
  const parsed = JSON.parse(content) as {
    schema_version: string;
    preset_name: string;
    preset_version: string;
  };

  return {
    schemaVersion: parsed.schema_version,
    presetName: parsed.preset_name,
    presetVersion: parsed.preset_version
  };
}
