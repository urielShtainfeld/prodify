import fs from 'node:fs/promises';

import { pathExists } from '../core/fs.js';
import { resolveCanonicalPath } from '../core/paths.js';
import { ProdifyError } from '../core/errors.js';
import { validateSkillDefinitionShape, validateSkillRegistryManifest } from './schema.js';
import type { SkillDefinition, SkillRegistryManifest } from '../types.js';

const SKILL_REGISTRY_PATH = '.prodify/skills/registry.json';

async function readJsonFile(filePath: string, missingCode: string, invalidCode: string): Promise<unknown> {
  if (!(await pathExists(filePath))) {
    throw new ProdifyError(`Required skill file is missing: ${filePath}.`, {
      code: missingCode
    });
  }

  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    throw new ProdifyError(`Skill file is malformed JSON: ${filePath}.`, {
      code: invalidCode
    });
  }
}

export async function readSkillRegistryManifest(repoRoot: string): Promise<SkillRegistryManifest> {
  const registryPath = resolveCanonicalPath(repoRoot, SKILL_REGISTRY_PATH);
  return validateSkillRegistryManifest(await readJsonFile(
    registryPath,
    'SKILL_REGISTRY_MISSING',
    'SKILL_REGISTRY_INVALID'
  ));
}

export async function loadSkillRegistry(repoRoot: string): Promise<Map<string, SkillDefinition>> {
  const manifest = await readSkillRegistryManifest(repoRoot);
  const registry = new Map<string, SkillDefinition>();

  for (const relativePath of manifest.skills) {
    const fullPath = resolveCanonicalPath(repoRoot, `.prodify/skills/${relativePath}`);
    const definition = validateSkillDefinitionShape(await readJsonFile(
      fullPath,
      'SKILL_DEFINITION_MISSING',
      'SKILL_DEFINITION_INVALID'
    ));

    if (registry.has(definition.id)) {
      throw new ProdifyError(`Duplicate skill id detected: ${definition.id}.`, {
        code: 'SKILL_REGISTRY_INVALID'
      });
    }

    registry.set(definition.id, definition);
  }

  return registry;
}
