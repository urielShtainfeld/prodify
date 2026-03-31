import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const DEFAULT_PRESET_ASSET_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/presets/default');
