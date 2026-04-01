import fs from 'node:fs/promises';
import { loadCompiledContract } from '../contracts/compiler.js';
import { normalizeRepoRelativePath, resolveRepoPath } from './paths.js';
function pathIsWithin(pathToCheck, root) {
    const normalizedPath = normalizeRepoRelativePath(pathToCheck);
    const normalizedRoot = normalizeRepoRelativePath(root);
    return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot.replace(/\/$/, '')}/`);
}
function collectMarkdownSections(markdown) {
    const sections = new Map();
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let currentHeading = null;
    let buffer = [];
    const flush = () => {
        if (currentHeading) {
            sections.set(currentHeading, buffer.join('\n').trim());
        }
    };
    for (const line of lines) {
        const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
        if (headingMatch) {
            flush();
            currentHeading = headingMatch[2].trim();
            buffer = [];
            continue;
        }
        buffer.push(line);
    }
    flush();
    return sections;
}
function containsAllStatements(sectionContent, statements) {
    return statements.every((statement) => sectionContent.includes(statement));
}
function buildRule(rule, message, path) {
    return { rule, message, path };
}
async function validateArtifact(repoRoot, contract, artifact) {
    const artifactPath = resolveRepoPath(repoRoot, artifact.path);
    const issues = [];
    const missing = [];
    const diagnostics = [];
    try {
        const content = await fs.readFile(artifactPath, 'utf8');
        diagnostics.push(`validated artifact ${artifact.path}`);
        if (!contract.allowed_write_roots.some((root) => pathIsWithin(artifact.path, root))) {
            issues.push(buildRule('artifact/outside-allowed-roots', `Required artifact ${artifact.path} is outside allowed write roots.`, artifact.path));
        }
        if (artifact.format === 'markdown') {
            const sections = collectMarkdownSections(content);
            for (const section of artifact.required_sections) {
                if (!sections.has(section)) {
                    issues.push(buildRule('artifact/markdown-section-missing', `Markdown artifact ${artifact.path} is missing section "${section}".`, artifact.path));
                }
            }
            const successCriteriaSection = sections.get('Success Criteria') ?? '';
            if (contract.success_criteria.length > 0 && !containsAllStatements(successCriteriaSection, contract.success_criteria)) {
                issues.push(buildRule('artifact/success-criteria-missing', `Markdown artifact ${artifact.path} does not document all success criteria.`, artifact.path));
            }
            const policyChecksSection = sections.get('Policy Checks') ?? '';
            if (contract.policy_rules.length > 0 && !containsAllStatements(policyChecksSection, contract.policy_rules)) {
                issues.push(buildRule('artifact/policy-rules-missing', `Markdown artifact ${artifact.path} does not document all policy checks.`, artifact.path));
            }
        }
        else {
            const parsed = JSON.parse(content);
            for (const key of artifact.required_json_keys) {
                if (!(key in parsed)) {
                    issues.push(buildRule('artifact/json-key-missing', `JSON artifact ${artifact.path} is missing key "${key}".`, artifact.path));
                }
            }
        }
    }
    catch {
        missing.push(artifact.path);
        issues.push(buildRule('artifact/missing', `Required artifact ${artifact.path} is missing.`, artifact.path));
    }
    return {
        issues,
        missing,
        diagnostics
    };
}
export async function validateStageOutputs(repoRoot, { contract, runtimeState, touchedPaths = [] }) {
    const violatedRules = [];
    const missingArtifacts = [];
    const diagnostics = [];
    const warnings = [];
    if (runtimeState.runtime.current_stage !== contract.stage) {
        violatedRules.push(buildRule('runtime/stage-mismatch', `Runtime stage ${runtimeState.runtime.current_stage ?? 'none'} does not match contract stage ${contract.stage}.`));
    }
    for (const artifact of contract.required_artifacts) {
        const artifactValidation = await validateArtifact(repoRoot, contract, artifact);
        violatedRules.push(...artifactValidation.issues);
        missingArtifacts.push(...artifactValidation.missing);
        diagnostics.push(...artifactValidation.diagnostics);
    }
    for (const rawTouchedPath of touchedPaths.map((entry) => normalizeRepoRelativePath(entry))) {
        if (!contract.allowed_write_roots.some((root) => pathIsWithin(rawTouchedPath, root))) {
            violatedRules.push(buildRule('writes/outside-allowed-roots', `Touched path ${rawTouchedPath} is outside the contract write boundary.`, rawTouchedPath));
        }
        if (contract.forbidden_writes.some((entry) => pathIsWithin(rawTouchedPath, entry))) {
            violatedRules.push(buildRule('writes/forbidden', `Touched path ${rawTouchedPath} is forbidden by the contract.`, rawTouchedPath));
        }
    }
    if (touchedPaths.length === 0) {
        warnings.push('No touched paths were provided; forbidden-write checks are limited to required artifacts.');
    }
    return {
        stage: contract.stage,
        contract_version: contract.contract_version,
        passed: violatedRules.length === 0,
        violated_rules: violatedRules,
        missing_artifacts: [...new Set(missingArtifacts)].sort((left, right) => left.localeCompare(right)),
        warnings,
        diagnostics
    };
}
export async function validateStageOutputsForCurrentState(repoRoot, { runtimeState, touchedPaths = [] }) {
    const stage = runtimeState.runtime.current_stage;
    if (!stage) {
        throw new Error('Cannot validate stage outputs when no stage is active.');
    }
    const contract = await loadCompiledContract(repoRoot, stage);
    return validateStageOutputs(repoRoot, {
        contract,
        runtimeState,
        touchedPaths
    });
}
export async function validateStageOutputsForStage(repoRoot, { stage, runtimeState, touchedPaths = [] }) {
    const contract = await loadCompiledContract(repoRoot, stage);
    return validateStageOutputs(repoRoot, {
        contract,
        runtimeState,
        touchedPaths
    });
}
