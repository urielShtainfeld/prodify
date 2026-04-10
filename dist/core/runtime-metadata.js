import fs from 'node:fs/promises';
import { inspectCompiledContracts } from '../contracts/freshness.js';
import { loadCompiledContract } from '../contracts/compiler.js';
import { readScoreDelta } from '../scoring/model.js';
import { pathExists, writeFileEnsuringDir } from './fs.js';
import { readPlanUnits, readSelectedRefactorStep } from './plan-units.js';
import { resolveCanonicalPath, resolveRepoPath } from './paths.js';
import { resolveStageSkills } from './skill-resolution.js';
const RUNTIME_METADATA_SCHEMA_VERSION = '1';
const ARTIFACT_ORDER = [
    { stage: 'understand', taskId: '01-understand' },
    { stage: 'diagnose', taskId: '02-diagnose' },
    { stage: 'architecture', taskId: '03-architecture' },
    { stage: 'plan', taskId: '04-plan' },
    { stage: 'refactor', taskId: '05-refactor' },
    { stage: 'validate', taskId: '06-validate' }
];
function serializeJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function currentStage(state) {
    return state.runtime.current_stage ?? state.runtime.pending_stage ?? 'understand';
}
async function readScoreSummary(repoRoot) {
    const readTotalScore = async (relativePath) => {
        const fullPath = resolveRepoPath(repoRoot, relativePath);
        if (!(await pathExists(fullPath))) {
            return null;
        }
        try {
            const parsed = JSON.parse(await fs.readFile(fullPath, 'utf8'));
            return typeof parsed.total_score === 'number' ? parsed.total_score : null;
        }
        catch {
            return null;
        }
    };
    return {
        baseline_score: await readTotalScore('.prodify/metrics/baseline.score.json'),
        final_score: await readTotalScore('.prodify/metrics/final.score.json'),
        delta: await readScoreDelta(repoRoot)
    };
}
function summarizeMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const headings = lines
        .map((line) => /^#{1,6}\s+(.+)$/.exec(line)?.[1]?.trim() ?? null)
        .filter((line) => Boolean(line))
        .slice(0, 8);
    const summaryLines = lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !line.startsWith('#'))
        .filter((line) => !line.startsWith('```'))
        .slice(0, 8);
    return {
        headings,
        summary_lines: summaryLines
    };
}
async function syncArtifactSummaries(repoRoot) {
    const summaries = [];
    for (const entry of ARTIFACT_ORDER) {
        const artifactPath = `.prodify/artifacts/${entry.taskId}.md`;
        const summaryPath = `.prodify/artifacts/${entry.taskId}.summary.json`;
        const fullArtifactPath = resolveRepoPath(repoRoot, artifactPath);
        const fullSummaryPath = resolveRepoPath(repoRoot, summaryPath);
        if (!(await pathExists(fullArtifactPath))) {
            if (await pathExists(fullSummaryPath)) {
                await fs.rm(fullSummaryPath);
            }
            continue;
        }
        const markdown = await fs.readFile(fullArtifactPath, 'utf8');
        const summary = {
            schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
            stage: entry.stage,
            task_id: entry.taskId,
            artifact_path: artifactPath,
            ...summarizeMarkdown(markdown)
        };
        await writeFileEnsuringDir(fullSummaryPath, serializeJson(summary));
        summaries.push({
            ...summary,
            summary_path: summaryPath
        });
    }
    return summaries;
}
async function loadCurrentContract(repoRoot, stage) {
    try {
        return await loadCompiledContract(repoRoot, stage);
    }
    catch {
        return null;
    }
}
async function loadCurrentSkillResolution(repoRoot, stage) {
    try {
        return await resolveStageSkills(repoRoot, stage);
    }
    catch {
        return null;
    }
}
async function loadSelectedPlanUnit(repoRoot, stage) {
    if (stage === 'plan') {
        try {
            const planUnits = await readPlanUnits(repoRoot);
            return planUnits[0] ?? null;
        }
        catch {
            return null;
        }
    }
    if (stage === 'refactor' || stage === 'validate') {
        try {
            return await readSelectedRefactorStep(repoRoot);
        }
        catch {
            return null;
        }
    }
    return null;
}
export async function syncRuntimeMetadata(repoRoot, state) {
    const stage = currentStage(state);
    const [contractInventory, contract, stageSkillResolution, scoreSummary, selectedPlanUnit, artifactSummaries] = await Promise.all([
        inspectCompiledContracts(repoRoot),
        loadCurrentContract(repoRoot, stage),
        loadCurrentSkillResolution(repoRoot, stage),
        readScoreSummary(repoRoot),
        loadSelectedPlanUnit(repoRoot, stage),
        syncArtifactSummaries(repoRoot)
    ]);
    const currentStageIndex = ARTIFACT_ORDER.findIndex((entry) => entry.stage === stage);
    const predecessorSummaries = artifactSummaries.filter((summary) => {
        const summaryIndex = ARTIFACT_ORDER.findIndex((entry) => entry.stage === summary.stage);
        return summaryIndex !== -1 && summaryIndex < currentStageIndex;
    });
    const currentStageSummary = artifactSummaries.find((summary) => summary.stage === stage) ?? null;
    const currentStagePack = {
        schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
        current_stage: stage,
        current_task_id: state.runtime.current_task_id ?? contract?.task_id ?? null,
        compiled_contract_path: contract ? `.prodify/contracts/${stage}.contract.json` : null,
        predecessor_artifact_summaries: predecessorSummaries.map((summary) => ({
            stage: summary.stage,
            task_id: summary.task_id,
            artifact_path: summary.artifact_path,
            summary_path: summary.summary_path,
            headings: summary.headings,
            summary_lines: summary.summary_lines
        })),
        current_artifact_summary: currentStageSummary ? {
            artifact_path: currentStageSummary.artifact_path,
            summary_path: currentStageSummary.summary_path,
            headings: currentStageSummary.headings,
            summary_lines: currentStageSummary.summary_lines
        } : null,
        selected_plan_unit: selectedPlanUnit,
        active_skill_ids: stageSkillResolution?.active_skill_ids ?? [],
        validation_requirements: contract?.success_criteria ?? [],
        artifact_dependencies: contract?.required_artifacts.map((artifact) => artifact.path) ?? [],
        score_summary: scoreSummary
    };
    const bootstrapManifest = {
        schema_version: RUNTIME_METADATA_SCHEMA_VERSION,
        runtime_state_path: '.prodify/state.json',
        current_state: state.runtime.current_state,
        runtime_status: state.runtime.status,
        current_stage: stage,
        current_task_id: state.runtime.current_task_id ?? contract?.task_id ?? null,
        compiled_contract_path: contract ? `.prodify/contracts/${stage}.contract.json` : null,
        selected_plan_unit: selectedPlanUnit,
        artifact_dependencies: contract?.required_artifacts.map((artifact) => artifact.path) ?? [],
        active_skill_ids: stageSkillResolution?.active_skill_ids ?? [],
        scoring_snapshot_summary: scoreSummary,
        next_recommended_action: state.runtime.next_action,
        resumable: state.runtime.resumable,
        contract_freshness: contractInventory.ok ? 'synchronized' : 'repair-required',
        current_stage_context_path: '.prodify/runtime/current-stage.json',
        commands: {
            init: '$prodify-init',
            execute: '$prodify-execute',
            resume: '$prodify-resume'
        }
    };
    await writeFileEnsuringDir(resolveCanonicalPath(repoRoot, '.prodify/runtime/current-stage.json'), serializeJson(currentStagePack));
    await writeFileEnsuringDir(resolveCanonicalPath(repoRoot, '.prodify/runtime/bootstrap.json'), serializeJson(bootstrapManifest));
}
