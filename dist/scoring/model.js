import fs from 'node:fs/promises';
import path from 'node:path';
import { ProdifyError } from '../core/errors.js';
import { pathExists, writeFileEnsuringDir } from '../core/fs.js';
import { resolveRepoPath } from '../core/paths.js';
import { calculateRepositoryQuality } from './scoring-engine.js';
const SCORE_SCHEMA_VERSION = '2';
function roundScore(value) {
    return Math.round(value * 100) / 100;
}
function serializeJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
async function removeIfExists(targetPath) {
    if (await pathExists(targetPath)) {
        await fs.rm(targetPath);
    }
}
function createMetric(label, points, maxPoints, details) {
    const normalizedPoints = roundScore(points);
    return {
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        tool: 'scoring-engine',
        weight: maxPoints,
        max_points: maxPoints,
        points: normalizedPoints,
        status: normalizedPoints >= maxPoints ? 'pass' : normalizedPoints <= 0 ? 'fail' : 'partial',
        details
    };
}
function toSnapshotMetrics(score) {
    return [
        createMetric('Structure', score.breakdown.structure * (score.weights.structure / 100), score.weights.structure, `modules=${score.signals.module_count}, avg_directory_depth=${score.signals.average_directory_depth}`),
        createMetric('Maintainability', score.breakdown.maintainability * (score.weights.maintainability / 100), score.weights.maintainability, `avg_function_length=${score.signals.average_function_length}`),
        createMetric('Complexity', score.breakdown.complexity * (score.weights.complexity / 100), score.weights.complexity, `dependency_depth=${score.signals.dependency_depth}, avg_imports=${score.signals.average_imports_per_module}`),
        createMetric('Testability', score.breakdown.testability * (score.weights.testability / 100), score.weights.testability, `test_file_ratio=${score.signals.test_file_ratio}`)
    ];
}
export async function calculateLocalScore(repoRoot, { kind, runtimeState }) {
    if (kind === 'final' && !(runtimeState.runtime.last_validation?.passed && (runtimeState.runtime.current_state === 'validate_complete' || runtimeState.runtime.current_state === 'completed'))) {
        throw new ProdifyError('Final scoring requires a validated runtime state at validate_complete or completed.', {
            code: 'SCORING_STATE_INVALID'
        });
    }
    const quality = await calculateRepositoryQuality(repoRoot);
    const snapshot = {
        schema_version: SCORE_SCHEMA_VERSION,
        kind,
        ecosystems: ['repository'],
        total_score: quality.total_score,
        max_score: quality.max_score,
        breakdown: quality.breakdown,
        weights: quality.weights,
        signals: quality.signals,
        metrics: toSnapshotMetrics(quality)
    };
    return {
        snapshot,
        toolOutputs: [{
                adapter: 'scoring-engine',
                details: {
                    kind,
                    breakdown: quality.breakdown,
                    weights: quality.weights,
                    signals: quality.signals
                }
            }]
    };
}
export async function calculateCurrentImpactDelta(repoRoot) {
    const metricsDir = resolveRepoPath(repoRoot, '.prodify/metrics');
    const baselinePath = path.join(metricsDir, 'baseline.score.json');
    if (!(await pathExists(baselinePath))) {
        return null;
    }
    const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
    const current = await calculateRepositoryQuality(repoRoot);
    return {
        schema_version: SCORE_SCHEMA_VERSION,
        baseline_score: baseline.total_score,
        final_score: current.total_score,
        delta: roundScore(current.total_score - baseline.total_score)
    };
}
export async function writeScoreSnapshot(repoRoot, { kind, runtimeState }) {
    const { snapshot, toolOutputs } = await calculateLocalScore(repoRoot, {
        kind,
        runtimeState
    });
    const metricsDir = resolveRepoPath(repoRoot, '.prodify/metrics');
    await writeFileEnsuringDir(path.join(metricsDir, `${kind}.score.json`), serializeJson(snapshot));
    await writeFileEnsuringDir(path.join(metricsDir, `${kind}.tools.json`), serializeJson({
        schema_version: SCORE_SCHEMA_VERSION,
        kind,
        outputs: toolOutputs
    }));
    return snapshot;
}
export async function writeScoreDelta(repoRoot, options = {}) {
    const metricsDir = resolveRepoPath(repoRoot, '.prodify/metrics');
    const baseline = JSON.parse(await fs.readFile(path.join(metricsDir, 'baseline.score.json'), 'utf8'));
    const final = JSON.parse(await fs.readFile(path.join(metricsDir, 'final.score.json'), 'utf8'));
    const deltaValue = roundScore(final.total_score - baseline.total_score);
    const threshold = options.minImpactScore;
    const delta = {
        schema_version: SCORE_SCHEMA_VERSION,
        baseline_score: baseline.total_score,
        final_score: final.total_score,
        delta: deltaValue,
        ...(threshold !== undefined ? {
            min_impact_score: threshold,
            passed: deltaValue >= threshold
        } : {})
    };
    await writeFileEnsuringDir(path.join(metricsDir, 'delta.json'), serializeJson(delta));
    return delta;
}
export async function readScoreDelta(repoRoot) {
    const deltaPath = resolveRepoPath(repoRoot, '.prodify/metrics/delta.json');
    if (!(await pathExists(deltaPath))) {
        return null;
    }
    return JSON.parse(await fs.readFile(deltaPath, 'utf8'));
}
export async function syncScoreArtifactsForRuntimeState(repoRoot, runtimeState) {
    if (runtimeState.runtime.current_state === 'bootstrapped' || runtimeState.runtime.current_state === 'understand_pending') {
        await writeScoreSnapshot(repoRoot, {
            kind: 'baseline',
            runtimeState
        });
        await removeIfExists(resolveRepoPath(repoRoot, '.prodify/metrics/final.score.json'));
        await removeIfExists(resolveRepoPath(repoRoot, '.prodify/metrics/final.tools.json'));
        await removeIfExists(resolveRepoPath(repoRoot, '.prodify/metrics/delta.json'));
    }
    if (runtimeState.runtime.last_validation?.passed && (runtimeState.runtime.current_state === 'validate_complete' || runtimeState.runtime.current_state === 'completed')) {
        await writeScoreSnapshot(repoRoot, {
            kind: 'final',
            runtimeState
        });
        await writeScoreDelta(repoRoot);
    }
}
