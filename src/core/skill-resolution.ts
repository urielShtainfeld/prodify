import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadCompiledContract } from '../contracts/compiler.js';
import { ProdifyError } from './errors.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { resolveCanonicalPath, resolveRepoPath } from './paths.js';
import { detectRepoContext } from './repo-context.js';
import { loadSkillRegistry } from '../skills/loader.js';
import type {
  FlowStage,
  RepoContextFact,
  RepoContextSnapshot,
  SkillActivationRecord,
  SkillCondition,
  SkillDefinition,
  StageSkillResolution,
  StageSkillRouting
} from '../types.js';

const SKILL_RESOLUTION_CACHE_SCHEMA_VERSION = '1';

function createHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function normalizeRepoContext(raw: unknown): RepoContextSnapshot {
  const record = asRecord(raw);
  const normalizeList = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').sort((left, right) => left.localeCompare(right))
    : [];

  return {
    languages: normalizeList(record.languages),
    frameworks: normalizeList(record.frameworks),
    project_types: normalizeList(record.project_types),
    architecture_patterns: normalizeList(record.architecture_patterns),
    risk_signals: normalizeList(record.risk_signals)
  };
}

function normalizeActivationRecords(value: unknown): SkillActivationRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.id === 'string' && typeof entry.name === 'string' && typeof entry.category === 'string')
    .map((entry) => ({
      id: entry.id as string,
      name: entry.name as string,
      category: entry.category as SkillActivationRecord['category'],
      source: (entry.source === 'conditional' ? 'conditional' : 'default') as 'conditional' | 'default',
      active: Boolean(entry.active),
      reason: typeof entry.reason === 'string' ? entry.reason : 'unknown'
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeStageSkillResolution(raw: unknown): StageSkillResolution | null {
  const record = asRecord(raw);
  if (typeof record.stage !== 'string') {
    return null;
  }

  return {
    stage: record.stage as FlowStage,
    context: normalizeRepoContext(record.context),
    considered_skills: normalizeActivationRecords(record.considered_skills),
    active_skill_ids: Array.isArray(record.active_skill_ids)
      ? record.active_skill_ids.filter((entry): entry is string => typeof entry === 'string').sort((left, right) => left.localeCompare(right))
      : []
  };
}

function factValues(context: RepoContextSnapshot, fact: RepoContextFact): string[] {
  switch (fact) {
    case 'language':
      return context.languages;
    case 'framework':
      return context.frameworks;
    case 'project_type':
      return context.project_types;
    case 'architecture_pattern':
      return context.architecture_patterns;
    case 'risk_signal':
      return context.risk_signals;
    default:
      return [];
  }
}

function formatCondition(condition: SkillCondition): string {
  return condition.all.map((predicate) => `${predicate.fact}=${predicate.includes}`).join(' and ');
}

function formatSkillActivationConditions(skill: SkillDefinition): string {
  return skill.activation_conditions.map((condition) => formatCondition(condition)).join(' or ');
}

function matchesCondition(context: RepoContextSnapshot, condition: SkillCondition): boolean {
  return condition.all.every((predicate) => factValues(context, predicate.fact).includes(predicate.includes));
}

function matchesSkillActivationConditions(context: RepoContextSnapshot, skill: SkillDefinition): boolean {
  if (skill.activation_conditions.length === 0) {
    return true;
  }

  return skill.activation_conditions.some((condition) => matchesCondition(context, condition));
}

function assertStageCompatible(skill: SkillDefinition, stage: FlowStage): void {
  if (!skill.stage_compatibility.includes(stage)) {
    throw new ProdifyError(`Skill "${skill.id}" is not compatible with stage "${stage}".`, {
      code: 'SKILL_STAGE_INCOMPATIBLE'
    });
  }
}

function resolveSkill(registry: Map<string, SkillDefinition>, skillId: string, stage: FlowStage): SkillDefinition {
  const skill = registry.get(skillId);
  if (!skill) {
    throw new ProdifyError(`Stage skill routing references unknown skill "${skillId}".`, {
      code: 'SKILL_NOT_FOUND'
    });
  }

  assertStageCompatible(skill, stage);
  return skill;
}

function defaultRecord(skill: SkillDefinition, active: boolean): SkillActivationRecord {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    source: 'default',
    active,
    reason: active ? 'default stage skill' : `inactive: ${formatSkillActivationConditions(skill)}`
  };
}

function conditionalRecord(skill: SkillDefinition, conditionLabel: string, active: boolean): SkillActivationRecord {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    source: 'conditional',
    active,
    reason: active ? conditionLabel : `inactive: ${conditionLabel}`
  };
}

function validateRouting(routing: StageSkillRouting, registry: Map<string, SkillDefinition>, stage: FlowStage): void {
  for (const skillId of routing.allowed_skills) {
    resolveSkill(registry, skillId, stage);
  }
}

async function computeSkillResolutionCacheKey(repoRoot: string, stage: FlowStage): Promise<string> {
  const contractPath = resolveCanonicalPath(repoRoot, `.prodify/contracts/${stage}.contract.json`);
  const registryPath = resolveCanonicalPath(repoRoot, '.prodify/skills/registry.json');
  const registryManifest = JSON.parse(await fs.readFile(registryPath, 'utf8')) as { skills?: unknown };
  const skillEntries = Array.isArray(registryManifest.skills)
    ? registryManifest.skills.filter((entry): entry is string => typeof entry === 'string').sort((left, right) => left.localeCompare(right))
    : [];
  const context = await detectRepoContext(repoRoot);
  const contractRaw = await fs.readFile(contractPath, 'utf8');
  const skillHashes = [];
  for (const relativePath of skillEntries) {
    const skillPath = resolveCanonicalPath(repoRoot, path.posix.join('.prodify/skills', relativePath));
    skillHashes.push({
      relativePath,
      hash: await fs.readFile(skillPath, 'utf8').then((content) => createHash(content.replace(/\r\n/g, '\n')))
    });
  }

  return createHash(JSON.stringify({
    stage,
    contract: createHash(contractRaw.replace(/\r\n/g, '\n')),
    context,
    skills: skillHashes
  }));
}

async function readCachedSkillResolution(
  repoRoot: string,
  stage: FlowStage,
  expectedCacheKey: string
): Promise<StageSkillResolution | null> {
  const cachePath = resolveRepoPath(repoRoot, `.prodify/runtime/skill-resolution/${stage}.json`);
  if (!(await pathExists(cachePath))) {
    return null;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(cachePath, 'utf8')) as Record<string, unknown>;
    if (parsed.schema_version !== SKILL_RESOLUTION_CACHE_SCHEMA_VERSION || parsed.cache_key !== expectedCacheKey) {
      return null;
    }

    return normalizeStageSkillResolution(parsed.resolution);
  } catch {
    return null;
  }
}

async function writeSkillResolutionCache(
  repoRoot: string,
  stage: FlowStage,
  cacheKey: string,
  resolution: StageSkillResolution
): Promise<void> {
  const cachePath = resolveRepoPath(repoRoot, `.prodify/runtime/skill-resolution/${stage}.json`);
  await writeFileEnsuringDir(cachePath, serializeJson({
    schema_version: SKILL_RESOLUTION_CACHE_SCHEMA_VERSION,
    cache_key: cacheKey,
    resolution
  }));
}

export async function resolveStageSkills(
  repoRoot: string,
  stage: FlowStage,
  options: { refresh?: boolean } = {}
): Promise<StageSkillResolution> {
  const cacheKey = await computeSkillResolutionCacheKey(repoRoot, stage);
  if (!options.refresh) {
    const cached = await readCachedSkillResolution(repoRoot, stage, cacheKey);
    if (cached) {
      return cached;
    }
  }

  const [contract, registry, context] = await Promise.all([
    loadCompiledContract(repoRoot, stage),
    loadSkillRegistry(repoRoot),
    detectRepoContext(repoRoot)
  ]);
  const routing = contract.skill_routing;

  validateRouting(routing, registry, stage);

  const consideredSkills: SkillActivationRecord[] = [];
  const activeSkillIds = new Set<string>();

  for (const skillId of routing.default_skills) {
    const skill = resolveSkill(registry, skillId, stage);
    const active = matchesSkillActivationConditions(context, skill);
    consideredSkills.push(defaultRecord(skill, active));
    if (active) {
      activeSkillIds.add(skill.id);
    }
  }

  for (const rule of routing.conditional_skills) {
    const skill = resolveSkill(registry, rule.skill, stage);
    const conditionLabel = rule.reason || formatCondition(rule.when);
    const active = matchesCondition(context, rule.when) && matchesSkillActivationConditions(context, skill);
    const existing = consideredSkills.find((entry) => entry.id === skill.id);
    if (existing) {
      if (active) {
        existing.active = true;
        existing.reason = `${existing.reason}; ${conditionLabel}`;
        activeSkillIds.add(skill.id);
      } else if (!existing.active && skill.activation_conditions.length > 0) {
        existing.reason = `inactive: ${formatSkillActivationConditions(skill)}`;
      }
      continue;
    }

    consideredSkills.push(conditionalRecord(skill, conditionLabel, active));
    if (active) {
      activeSkillIds.add(skill.id);
    }
  }

  const resolution = {
    stage,
    context,
    considered_skills: consideredSkills.sort((left, right) => left.id.localeCompare(right.id)),
    active_skill_ids: [...activeSkillIds].sort((left, right) => left.localeCompare(right))
  };

  await writeSkillResolutionCache(repoRoot, stage, cacheKey, resolution);
  return resolution;
}
