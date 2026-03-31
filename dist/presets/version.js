export function createVersionMetadata(presetMetadata) {
    return {
        schema_version: presetMetadata.schemaVersion,
        preset_name: presetMetadata.name,
        preset_version: presetMetadata.version
    };
}
export function serializeVersionMetadata(presetMetadata) {
    return `${JSON.stringify(createVersionMetadata(presetMetadata), null, 2)}\n`;
}
export function parseVersionMetadata(content) {
    const parsed = JSON.parse(content);
    return {
        schemaVersion: parsed.schema_version,
        presetName: parsed.preset_name,
        presetVersion: parsed.preset_version
    };
}
