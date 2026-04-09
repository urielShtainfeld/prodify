import fs from 'node:fs/promises';
import path from 'node:path';
import { listFilesRecursive } from '../core/fs.js';
import { normalizeRepoRelativePath } from '../core/paths.js';
const SCORE_WEIGHTS = {
    structure: 30,
    maintainability: 30,
    complexity: 20,
    testability: 20
};
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.cs']);
function round(value) {
    return Math.round(value * 100) / 100;
}
function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}
function scoreInverse(value, ideal, tolerance) {
    if (value <= ideal) {
        return 100;
    }
    return clamp(100 - (((value - ideal) / tolerance) * 100));
}
function extractImports(content) {
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('import ') || line.startsWith('export ') || line.includes('require('));
}
function extractDependencyDepth(imports) {
    const relativeImports = imports
        .map((line) => /from\s+['"](.+?)['"]/.exec(line)?.[1] ?? /require\(['"](.+?)['"]\)/.exec(line)?.[1] ?? '')
        .filter((specifier) => specifier.startsWith('./') || specifier.startsWith('../'));
    if (relativeImports.length === 0) {
        return 0;
    }
    return Math.max(...relativeImports.map((specifier) => specifier.split('/').filter((segment) => segment === '..').length));
}
function extractFunctionLengths(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const lengths = [];
    let captureDepth = 0;
    let currentLength = 0;
    let tracking = false;
    for (const line of lines) {
        const trimmed = line.trim();
        const startsFunction = /^(export\s+)?(async\s+)?function\s+\w+/.test(trimmed)
            || /^(export\s+)?const\s+\w+\s*=\s*(async\s*)?\(/.test(trimmed)
            || /^(public\s+|private\s+|protected\s+)?(async\s+)?\w+\s*\(.*\)\s*\{?$/.test(trimmed);
        if (startsFunction && trimmed.includes('{')) {
            tracking = true;
            currentLength = 1;
            captureDepth = (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
            if (captureDepth <= 0) {
                lengths.push(currentLength);
                tracking = false;
                currentLength = 0;
                captureDepth = 0;
            }
            continue;
        }
        if (!tracking) {
            continue;
        }
        currentLength += 1;
        captureDepth += (trimmed.match(/\{/g) ?? []).length;
        captureDepth -= (trimmed.match(/\}/g) ?? []).length;
        if (captureDepth <= 0) {
            lengths.push(currentLength);
            tracking = false;
            currentLength = 0;
            captureDepth = 0;
        }
    }
    return lengths;
}
async function collectSourceFiles(repoRoot) {
    const allFiles = await listFilesRecursive(repoRoot);
    const sourceFiles = [];
    for (const file of allFiles) {
        const relativePath = normalizeRepoRelativePath(file.relativePath);
        if (relativePath.startsWith('.git/')
            || relativePath.startsWith('.prodify/')
            || relativePath.startsWith('.agent/')
            || relativePath.startsWith('.codex/')
            || relativePath.startsWith('dist/')
            || relativePath.startsWith('node_modules/')) {
            continue;
        }
        if (!CODE_EXTENSIONS.has(path.extname(relativePath))) {
            continue;
        }
        sourceFiles.push({
            path: relativePath,
            content: await fs.readFile(file.fullPath, 'utf8')
        });
    }
    return sourceFiles.sort((left, right) => left.path.localeCompare(right.path));
}
function deriveSignals(sourceFiles) {
    const functionLengths = sourceFiles.flatMap((file) => extractFunctionLengths(file.content));
    const allImports = sourceFiles.map((file) => extractImports(file.content));
    const moduleCount = sourceFiles.length;
    const averageFunctionLength = functionLengths.length === 0
        ? 0
        : functionLengths.reduce((sum, value) => sum + value, 0) / functionLengths.length;
    const averageDirectoryDepth = moduleCount === 0
        ? 0
        : sourceFiles
            .map((file) => path.posix.dirname(file.path))
            .map((directory) => directory === '.' ? 0 : directory.split('/').length)
            .reduce((sum, depth) => sum + depth, 0) / moduleCount;
    const dependencyDepth = allImports.length === 0
        ? 0
        : Math.max(...allImports.map((imports) => extractDependencyDepth(imports)));
    const averageImportsPerModule = moduleCount === 0
        ? 0
        : allImports.reduce((sum, imports) => sum + imports.length, 0) / moduleCount;
    const testFiles = sourceFiles.filter((file) => file.path.startsWith('tests/') || /\.test\./.test(file.path)).length;
    const sourceModules = Math.max(1, sourceFiles.filter((file) => file.path.startsWith('src/')).length);
    const testFileRatio = testFiles / sourceModules;
    return {
        average_function_length: round(averageFunctionLength),
        module_count: moduleCount,
        average_directory_depth: round(averageDirectoryDepth),
        dependency_depth: dependencyDepth,
        average_imports_per_module: round(averageImportsPerModule),
        test_file_ratio: round(testFileRatio)
    };
}
function buildBreakdown(signals) {
    const structure = round(((clamp(signals.module_count * 5, 0, 60)) + clamp(signals.average_directory_depth * 15, 0, 40)));
    const maintainability = round((scoreInverse(signals.average_function_length, 18, 40) * 0.7) + (scoreInverse(signals.average_imports_per_module, 4, 8) * 0.3));
    const complexity = round((scoreInverse(signals.dependency_depth, 1, 5) * 0.6) + (scoreInverse(signals.average_imports_per_module, 4, 8) * 0.4));
    const testability = round(clamp(signals.test_file_ratio * 100, 0, 100));
    return {
        structure: clamp(structure),
        maintainability: clamp(maintainability),
        complexity: clamp(complexity),
        testability: clamp(testability)
    };
}
export async function calculateRepositoryQuality(repoRoot) {
    const sourceFiles = await collectSourceFiles(repoRoot);
    const signals = deriveSignals(sourceFiles);
    const breakdown = buildBreakdown(signals);
    const total = round((breakdown.structure * (SCORE_WEIGHTS.structure / 100))
        + (breakdown.maintainability * (SCORE_WEIGHTS.maintainability / 100))
        + (breakdown.complexity * (SCORE_WEIGHTS.complexity / 100))
        + (breakdown.testability * (SCORE_WEIGHTS.testability / 100)));
    return {
        breakdown,
        signals,
        total_score: total,
        max_score: 100,
        weights: SCORE_WEIGHTS
    };
}
