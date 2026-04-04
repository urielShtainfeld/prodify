import { normalizeRepoRelativePath } from '../core/paths.js';
import { ProdifyError } from '../core/errors.js';
import { CONTRACT_STAGE_NAMES } from '../contracts/source-schema.js';
import type {
  FlowStage,
  RepoContextFact,
  SkillCategory,
  SkillCondition,
  SkillConditionPredicate,
  SkillDefinition,
  SkillRegistryManifest,
  StageSkillRouting,
  StageSkillRoutingRule
} from '../types.js';

const SKILL_CATEGORIES: readonly SkillCategory[] = ['stage-method', 'domain', 'quality-policy'];
const REPO_CONTEXT_FACTS: readonly RepoContextFact[] = ['language', 'framework', 'project_type', 'architecture_pattern', 'risk_signal'];

function asString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProdifyError(`Skill field "${fieldName}" must be a non-empty string.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  return value.trim();
}

function asOptionalStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return asStringArray(value, fieldName);
}

function asStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProdifyError(`Skill field "${fieldName}" must be a non-empty list.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  const normalized = value.map((entry) => asString(entry, fieldName));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ProdifyError(`Skill field "${fieldName}" must be a mapping.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  return value as Record<string, unknown>;
}

function asSkillCategory(value: unknown): SkillCategory {
  const category = asString(value, 'category') as SkillCategory;
  if (!SKILL_CATEGORIES.includes(category)) {
    throw new ProdifyError(`Skill category is invalid: ${category}.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  return category;
}

function asStageList(value: unknown, fieldName: string): FlowStage[] {
  const stages = asStringArray(value, fieldName) as FlowStage[];
  for (const stage of stages) {
    if (!CONTRACT_STAGE_NAMES.includes(stage)) {
      throw new ProdifyError(`Skill field "${fieldName}" contains unsupported stage "${stage}".`, {
        code: 'SKILL_SCHEMA_INVALID'
      });
    }
  }

  return stages;
}

function normalizePredicate(value: unknown, fieldName: string): SkillConditionPredicate {
  const record = asRecord(value, fieldName);
  const fact = asString(record.fact, `${fieldName}.fact`) as RepoContextFact;
  if (!REPO_CONTEXT_FACTS.includes(fact)) {
    throw new ProdifyError(`Skill condition fact is invalid: ${fact}.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  return {
    fact,
    includes: asString(record.includes, `${fieldName}.includes`)
  };
}

export function normalizeSkillCondition(value: unknown, fieldName: string): SkillCondition {
  const record = asRecord(value, fieldName);
  const all = Array.isArray(record.all)
    ? record.all.map((entry, index) => normalizePredicate(entry, `${fieldName}.all[${index}]`))
    : [];

  if (all.length === 0) {
    throw new ProdifyError(`Skill condition "${fieldName}" must declare at least one "all" predicate.`, {
      code: 'SKILL_SCHEMA_INVALID'
    });
  }

  return {
    all: all.sort((left, right) => `${left.fact}:${left.includes}`.localeCompare(`${right.fact}:${right.includes}`))
  };
}

export function validateSkillDefinitionShape(value: unknown): SkillDefinition {
  const record = asRecord(value, 'skill');
  return {
    schema_version: asString(record.schema_version, 'schema_version'),
    id: asString(record.id, 'id'),
    name: asString(record.name, 'name'),
    version: asString(record.version, 'version'),
    category: asSkillCategory(record.category),
    description: asString(record.description, 'description'),
    intended_use: asStringArray(record.intended_use, 'intended_use'),
    stage_compatibility: asStageList(record.stage_compatibility, 'stage_compatibility'),
    activation_conditions: Array.isArray(record.activation_conditions)
      ? record.activation_conditions.map((entry, index) => normalizeSkillCondition(entry, `activation_conditions[${index}]`))
      : [],
    execution_guidance: asStringArray(record.execution_guidance, 'execution_guidance'),
    caution_guidance: asOptionalStringArray(record.caution_guidance, 'caution_guidance')
  };
}

export function validateSkillRegistryManifest(value: unknown): SkillRegistryManifest {
  const record = asRecord(value, 'skill registry');
  return {
    schema_version: asString(record.schema_version, 'schema_version'),
    skills: asStringArray(record.skills, 'skills')
      .map((entry) => normalizeRepoRelativePath(entry))
  };
}

function validateRoutingSkillIds(skillIds: string[], fieldName: string): string[] {
  return [...new Set(skillIds.map((entry) => asString(entry, fieldName)))].sort((left, right) => left.localeCompare(right));
}

function normalizeRoutingRule(value: unknown, fieldName: string): StageSkillRoutingRule {
  const record = asRecord(value, fieldName);
  return {
    skill: asString(record.skill, `${fieldName}.skill`),
    when: normalizeSkillCondition(record.when, `${fieldName}.when`),
    reason: asString(record.reason, `${fieldName}.reason`)
  };
}

export function normalizeStageSkillRouting(value: unknown): StageSkillRouting {
  if (value === undefined || value === null) {
    return {
      default_skills: [],
      allowed_skills: [],
      conditional_skills: []
    };
  }

  const record = asRecord(value, 'skill_routing');
  const defaultSkills = Array.isArray(record.default_skills)
    ? validateRoutingSkillIds(record.default_skills, 'skill_routing.default_skills')
    : [];
  const allowedSkills = Array.isArray(record.allowed_skills)
    ? validateRoutingSkillIds(record.allowed_skills, 'skill_routing.allowed_skills')
    : [];
  const conditionalSkills = Array.isArray(record.conditional_skills)
    ? record.conditional_skills.map((entry, index) => normalizeRoutingRule(entry, `skill_routing.conditional_skills[${index}]`))
      .sort((left, right) => left.skill.localeCompare(right.skill) || left.reason.localeCompare(right.reason))
    : [];

  for (const skillId of defaultSkills) {
    if (!allowedSkills.includes(skillId)) {
      throw new ProdifyError(`Default skill "${skillId}" must also be listed in allowed_skills.`, {
        code: 'SKILL_ROUTING_INVALID'
      });
    }
  }

  for (const rule of conditionalSkills) {
    if (!allowedSkills.includes(rule.skill)) {
      throw new ProdifyError(`Conditional skill "${rule.skill}" must also be listed in allowed_skills.`, {
        code: 'SKILL_ROUTING_INVALID'
      });
    }
  }

  return {
    default_skills: defaultSkills,
    allowed_skills: allowedSkills,
    conditional_skills: conditionalSkills
  };
}
