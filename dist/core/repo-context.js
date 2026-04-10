import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { detectHotspots } from './hotspots.js';
import { listFilesRecursive, pathExists, writeFileEnsuringDir } from './fs.js';
import { resolveRepoPath } from './paths.js';
const REPO_CONTEXT_CACHE_SCHEMA_VERSION = '1';
const REPO_CONTEXT_CACHE_PATH = '.prodify/runtime/repo-context.json';
function sortedUnique(values) {
    return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
function createHash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function serializeJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function asRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
async function readPackageJson(repoRoot) {
    const packageJsonPath = resolveRepoPath(repoRoot, 'package.json');
    if (!(await pathExists(packageJsonPath))) {
        return null;
    }
    try {
        const raw = await fs.readFile(packageJsonPath, 'utf8');
        return {
            raw,
            parsed: JSON.parse(raw)
        };
    }
    catch {
        return null;
    }
}
function dependencyEntries(packageJson) {
    if (!packageJson) {
        return [];
    }
    const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    const names = [];
    for (const section of sections) {
        const record = packageJson[section];
        if (typeof record !== 'object' || record === null || Array.isArray(record)) {
            continue;
        }
        names.push(...Object.keys(record));
    }
    return sortedUnique(names);
}
function normalizeRepoContext(raw) {
    const record = asRecord(raw);
    const normalizeList = (value) => Array.isArray(value)
        ? value.filter((entry) => typeof entry === 'string').sort((left, right) => left.localeCompare(right))
        : [];
    const snapshot = {
        languages: normalizeList(record.languages),
        frameworks: normalizeList(record.frameworks),
        project_types: normalizeList(record.project_types),
        architecture_patterns: normalizeList(record.architecture_patterns),
        risk_signals: normalizeList(record.risk_signals),
        hotspots: Array.isArray(record.hotspots)
            ? record.hotspots
                .map((entry) => asRecord(entry))
                .filter((entry) => typeof entry.path === 'string' && typeof entry.score === 'number')
                .map((entry) => ({
                path: entry.path,
                score: entry.score,
                reasons: Array.isArray(entry.reasons) ? entry.reasons.filter((reason) => typeof reason === 'string') : [],
                line_count: typeof entry.line_count === 'number' ? entry.line_count : 0,
                import_count: typeof entry.import_count === 'number' ? entry.import_count : 0
            }))
            : []
    };
    const hasContent = snapshot.languages.length > 0
        || snapshot.frameworks.length > 0
        || snapshot.project_types.length > 0
        || snapshot.architecture_patterns.length > 0
        || snapshot.risk_signals.length > 0;
    return hasContent ? snapshot : {
        languages: [],
        frameworks: [],
        project_types: [],
        architecture_patterns: [],
        risk_signals: [],
        hotspots: []
    };
}
async function buildRepoContextInputs(repoRoot) {
    const packageJson = await readPackageJson(repoRoot);
    const files = await listFilesRecursive(repoRoot);
    const relativePaths = files
        .map((entry) => entry.relativePath.replaceAll('\\', '/'))
        .filter((relativePath) => !relativePath.startsWith('.git/'))
        .filter((relativePath) => !relativePath.startsWith('node_modules/'))
        .filter((relativePath) => !relativePath.startsWith('.prodify/runtime/'))
        .sort((left, right) => left.localeCompare(right));
    const packageJsonRaw = packageJson?.raw ?? '';
    const cacheKey = createHash(JSON.stringify({
        packageJsonRaw,
        relativePaths
    }));
    return {
        packageJsonRaw,
        relativePaths,
        cacheKey
    };
}
async function readCachedRepoContext(repoRoot, expectedCacheKey) {
    const cachePath = resolveRepoPath(repoRoot, REPO_CONTEXT_CACHE_PATH);
    if (!(await pathExists(cachePath))) {
        return null;
    }
    try {
        const raw = JSON.parse(await fs.readFile(cachePath, 'utf8'));
        if (raw.schema_version !== REPO_CONTEXT_CACHE_SCHEMA_VERSION || raw.cache_key !== expectedCacheKey) {
            return null;
        }
        return normalizeRepoContext(raw.context);
    }
    catch {
        return null;
    }
}
async function writeRepoContextCache(repoRoot, cacheKey, context) {
    const cachePath = resolveRepoPath(repoRoot, REPO_CONTEXT_CACHE_PATH);
    await writeFileEnsuringDir(cachePath, serializeJson({
        schema_version: REPO_CONTEXT_CACHE_SCHEMA_VERSION,
        cache_key: cacheKey,
        context
    }));
}
export async function detectRepoContext(repoRoot, options = {}) {
    const { packageJsonRaw, relativePaths, cacheKey } = await buildRepoContextInputs(repoRoot);
    if (!options.refresh) {
        const cached = await readCachedRepoContext(repoRoot, cacheKey);
        if (cached) {
            return cached;
        }
    }
    const packageJson = packageJsonRaw ? JSON.parse(packageJsonRaw) : null;
    const dependencies = dependencyEntries(packageJson);
    const hasTsConfig = relativePaths.includes('tsconfig.json');
    const hasTypeScriptSources = relativePaths.some((relativePath) => relativePath.endsWith('.ts') || relativePath.endsWith('.tsx'));
    const hasJavaScriptSources = relativePaths.some((relativePath) => relativePath.endsWith('.js') || relativePath.endsWith('.jsx'));
    const hasTests = relativePaths.some((relativePath) => relativePath.startsWith('tests/') || relativePath.includes('.test.'));
    const hasCliEntrypoint = relativePaths.includes('src/cli.ts')
        || relativePaths.includes('src/cli.js')
        || relativePaths.includes('bin/prodify');
    const hasCoreDir = relativePaths.some((relativePath) => relativePath.startsWith('src/core/'));
    const hasCommandsDir = relativePaths.some((relativePath) => relativePath.startsWith('src/commands/'));
    const languages = sortedUnique([
        ...(hasTypeScriptSources || hasTsConfig ? ['typescript'] : []),
        ...(hasJavaScriptSources || packageJson ? ['javascript'] : [])
    ]);
    const frameworks = sortedUnique([
        ...(dependencies.includes('react') || dependencies.includes('react-dom') ? ['react'] : [])
    ]);
    const projectTypes = sortedUnique([
        ...(packageJson ? ['node-package'] : []),
        ...(hasCliEntrypoint ? ['cli'] : []),
        ...(frameworks.includes('react') ? ['frontend-app'] : []),
        ...(!frameworks.includes('react') && hasCoreDir ? ['backend-service'] : [])
    ]);
    const architecturePatterns = sortedUnique([
        ...(hasCoreDir && hasCommandsDir ? ['layered-cli'] : []),
        ...(relativePaths.some((relativePath) => relativePath.startsWith('src/contracts/')) ? ['contract-driven-runtime'] : [])
    ]);
    const riskSignals = sortedUnique([
        ...(dependencies.length > 0 ? ['external-dependencies'] : []),
        ...(hasCliEntrypoint ? ['cli-surface'] : []),
        ...(!hasTests ? ['missing-tests'] : [])
    ]);
    const snapshot = {
        languages,
        frameworks,
        project_types: projectTypes,
        architecture_patterns: architecturePatterns,
        risk_signals: riskSignals,
        hotspots: await detectHotspots(repoRoot)
    };
    await writeRepoContextCache(repoRoot, cacheKey, snapshot);
    return snapshot;
}
