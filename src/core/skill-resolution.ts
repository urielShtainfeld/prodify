import { loadCompiledContract } from '../contracts/compiler.js';
import { ProdifyError } from './errors.js';
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

export async function resolveStageSkills(repoRoot: string, stage: FlowStage): Promise<StageSkillResolution> {
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

  return {
    stage,
    context,
    considered_skills: consideredSkills.sort((left, right) => left.id.localeCompare(right.id)),
    active_skill_ids: [...activeSkillIds].sort((left, right) => left.localeCompare(right))
  };
}
