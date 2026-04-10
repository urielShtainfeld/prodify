import fs from 'node:fs/promises';
import path from 'node:path';
import { listFilesRecursive, pathExists, writeFileEnsuringDir } from './fs.js';
import { normalizeRepoRelativePath, resolveRepoPath } from './paths.js';
const DIFF_SNAPSHOT_SCHEMA_VERSION = '1';
const BASELINE_SNAPSHOT_PATH = '.prodify/metrics/refactor-baseline.snapshot.json';
const TRACKED_PREFIXES = ['src/', 'tests/', 'assets/'];
const TRACKED_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.py', '.cs', '.css', '.scss', '.html']);
const LAYER_DIRECTORY_NAMES = new Set(['application', 'domain', 'services', 'service', 'modules', 'module', 'adapters', 'infrastructure', 'core']);
function stripCodeComments(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/^\s*#.*$/gm, '')
        .trim();
}
function isTrackedPath(relativePath) {
    const normalized = normalizeRepoRelativePath(relativePath);
    if (!TRACKED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
        return false;
    }
    return TRACKED_FILE_EXTENSIONS.has(path.extname(normalized));
}
function normalizeWhitespace(content) {
    return content
        .replace(/\s+/g, '')
        .trim();
}
function toMap(snapshot) {
    return new Map(snapshot.files.map((file) => [file.path, file]));
}
function diffLines(before, after) {
    const beforeLines = before.replace(/\r\n/g, '\n').split('\n');
    const afterLines = after.replace(/\r\n/g, '\n').split('\n');
    const rows = beforeLines.length;
    const cols = afterLines.length;
    const dp = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
    for (let row = rows - 1; row >= 0; row -= 1) {
        for (let col = cols - 1; col >= 0; col -= 1) {
            if (beforeLines[row] === afterLines[col]) {
                dp[row][col] = dp[row + 1][col + 1] + 1;
            }
            else {
                dp[row][col] = Math.max(dp[row + 1][col], dp[row][col + 1]);
            }
        }
    }
    const common = dp[0][0];
    return {
        added: Math.max(0, afterLines.length - common),
        removed: Math.max(0, beforeLines.length - common)
    };
}
function collectDirectories(paths) {
    return [...new Set(paths
            .map((relativePath) => path.posix.dirname(relativePath))
            .filter((directory) => directory !== '.' && directory !== ''))]
        .sort((left, right) => left.localeCompare(right));
}
function detectStructuralChanges(options) {
    const newDirectories = collectDirectories(options.addedPaths);
    const newLayers = newDirectories.filter((directory) => LAYER_DIRECTORY_NAMES.has(path.posix.basename(directory)));
    const filesWithReducedResponsibility = options.modifiedPaths
        .filter((relativePath) => (options.removedLineCounts.get(relativePath) ?? 0) > 0)
        .sort((left, right) => left.localeCompare(right));
    const newModules = options.addedPaths
        .filter((relativePath) => relativePath.startsWith('src/'))
        .sort((left, right) => left.localeCompare(right));
    const flags = new Set();
    if (newDirectories.length > 0) {
        flags.add('new-directories');
    }
    if (newLayers.length > 0) {
        flags.add('new-layer-directories');
        flags.add('module-boundary-created');
    }
    if (newModules.length > 0) {
        flags.add('new-modules');
        flags.add('module-boundary-created');
    }
    if (filesWithReducedResponsibility.length > 0) {
        flags.add('responsibility-reduced');
    }
    return {
        new_directories: newDirectories,
        new_layer_directories: newLayers,
        files_with_reduced_responsibility: filesWithReducedResponsibility,
        new_modules: newModules,
        structural_change_flags: [...flags].sort((left, right) => left.localeCompare(right))
    };
}
function serializeSnapshot(snapshot) {
    return `${JSON.stringify(snapshot, null, 2)}\n`;
}
export async function captureRepoSnapshot(repoRoot) {
    const repoFiles = await listFilesRecursive(repoRoot);
    const files = [];
    for (const file of repoFiles) {
        if (!isTrackedPath(file.relativePath)) {
            continue;
        }
        files.push({
            path: normalizeRepoRelativePath(file.relativePath),
            content: await fs.readFile(file.fullPath, 'utf8')
        });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    return {
        schema_version: DIFF_SNAPSHOT_SCHEMA_VERSION,
        files
    };
}
export async function writeRefactorBaselineSnapshot(repoRoot) {
    const snapshot = await captureRepoSnapshot(repoRoot);
    await writeFileEnsuringDir(resolveRepoPath(repoRoot, BASELINE_SNAPSHOT_PATH), serializeSnapshot(snapshot));
    return snapshot;
}
export async function readRefactorBaselineSnapshot(repoRoot) {
    const baselinePath = resolveRepoPath(repoRoot, BASELINE_SNAPSHOT_PATH);
    if (!(await pathExists(baselinePath))) {
        return null;
    }
    return JSON.parse(await fs.readFile(baselinePath, 'utf8'));
}
export function diffSnapshots(before, after) {
    const beforeMap = toMap(before);
    const afterMap = toMap(after);
    const allPaths = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort((left, right) => left.localeCompare(right));
    const modifiedPaths = [];
    const addedPaths = [];
    const deletedPaths = [];
    const formattingOnlyPaths = [];
    const commentOnlyPaths = [];
    let linesAdded = 0;
    let linesRemoved = 0;
    let nonFormattingLinesAdded = 0;
    let nonFormattingLinesRemoved = 0;
    const removedLineCounts = new Map();
    for (const relativePath of allPaths) {
        const beforeFile = beforeMap.get(relativePath);
        const afterFile = afterMap.get(relativePath);
        if (!beforeFile && afterFile) {
            addedPaths.push(relativePath);
            const added = afterFile.content.replace(/\r\n/g, '\n').split('\n').length;
            linesAdded += added;
            nonFormattingLinesAdded += added;
            continue;
        }
        if (beforeFile && !afterFile) {
            deletedPaths.push(relativePath);
            const removed = beforeFile.content.replace(/\r\n/g, '\n').split('\n').length;
            linesRemoved += removed;
            nonFormattingLinesRemoved += removed;
            removedLineCounts.set(relativePath, removed);
            continue;
        }
        if (!beforeFile || !afterFile || beforeFile.content === afterFile.content) {
            continue;
        }
        modifiedPaths.push(relativePath);
        if (normalizeWhitespace(beforeFile.content) === normalizeWhitespace(afterFile.content)) {
            formattingOnlyPaths.push(relativePath);
            continue;
        }
        if (normalizeWhitespace(stripCodeComments(beforeFile.content)) === normalizeWhitespace(stripCodeComments(afterFile.content))) {
            commentOnlyPaths.push(relativePath);
            continue;
        }
        const lineDiff = diffLines(beforeFile.content, afterFile.content);
        linesAdded += lineDiff.added;
        linesRemoved += lineDiff.removed;
        nonFormattingLinesAdded += lineDiff.added;
        nonFormattingLinesRemoved += lineDiff.removed;
        removedLineCounts.set(relativePath, lineDiff.removed);
    }
    return {
        filesModified: modifiedPaths.length,
        filesAdded: addedPaths.length,
        filesDeleted: deletedPaths.length,
        linesAdded,
        linesRemoved,
        nonFormattingLinesAdded,
        nonFormattingLinesRemoved,
        modifiedPaths,
        addedPaths,
        deletedPaths,
        formattingOnlyPaths,
        commentOnlyPaths,
        structuralChanges: detectStructuralChanges({
            addedPaths,
            modifiedPaths,
            beforeMap,
            afterMap,
            removedLineCounts
        })
    };
}
export async function diffAgainstRefactorBaseline(repoRoot) {
    const baseline = await readRefactorBaselineSnapshot(repoRoot);
    if (!baseline) {
        return null;
    }
    const current = await captureRepoSnapshot(repoRoot);
    return diffSnapshots(baseline, current);
}
