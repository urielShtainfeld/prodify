import { loadCompiledContract } from '../contracts/compiler.js';
import { ProdifyError } from './errors.js';
import { detectRepoContext } from './repo-context.js';
import { loadSkillRegistry } from '../skills/loader.js';
function factValues(context, fact) {
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
function formatCondition(condition) {
    return condition.all.map((predicate) => `${predicate.fact}=${predicate.includes}`).join(' and ');
}
function formatSkillActivationConditions(skill) {
    return skill.activation_conditions.map((condition) => formatCondition(condition)).join(' or ');
}
function matchesCondition(context, condition) {
    return condition.all.every((predicate) => factValues(context, predicate.fact).includes(predicate.includes));
}
function matchesSkillActivationConditions(context, skill) {
    if (skill.activation_conditions.length === 0) {
        return true;
    }
    return skill.activation_conditions.some((condition) => matchesCondition(context, condition));
}
function assertStageCompatible(skill, stage) {
    if (!skill.stage_compatibility.includes(stage)) {
        throw new ProdifyError(`Skill "${skill.id}" is not compatible with stage "${stage}".`, {
            code: 'SKILL_STAGE_INCOMPATIBLE'
        });
    }
}
function resolveSkill(registry, skillId, stage) {
    const skill = registry.get(skillId);
    if (!skill) {
        throw new ProdifyError(`Stage skill routing references unknown skill "${skillId}".`, {
            code: 'SKILL_NOT_FOUND'
        });
    }
    assertStageCompatible(skill, stage);
    return skill;
}
function defaultRecord(skill, active) {
    return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        source: 'default',
        active,
        reason: active ? 'default stage skill' : `inactive: ${formatSkillActivationConditions(skill)}`
    };
}
function conditionalRecord(skill, conditionLabel, active) {
    return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        source: 'conditional',
        active,
        reason: active ? conditionLabel : `inactive: ${conditionLabel}`
    };
}
function validateRouting(routing, registry, stage) {
    for (const skillId of routing.allowed_skills) {
        resolveSkill(registry, skillId, stage);
    }
}
export async function resolveStageSkills(repoRoot, stage) {
    const [contract, registry, context] = await Promise.all([
        loadCompiledContract(repoRoot, stage),
        loadSkillRegistry(repoRoot),
        detectRepoContext(repoRoot)
    ]);
    const routing = contract.skill_routing;
    validateRouting(routing, registry, stage);
    const consideredSkills = [];
    const activeSkillIds = new Set();
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
            }
            else if (!existing.active && skill.activation_conditions.length > 0) {
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
