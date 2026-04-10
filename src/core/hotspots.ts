import fs from 'node:fs/promises';
import path from 'node:path';

import { listFilesRecursive } from './fs.js';
import { normalizeRepoRelativePath, resolveRepoPath } from './paths.js';
import type { HotspotImprovement, HotspotRecord } from '../types.js';

interface SnapshotLike {
  files: Array<{
    path: string;
    content: string;
  }>;
}

const HOTSPOT_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function trackedSourceFile(relativePath: string): boolean {
  const normalized = normalizeRepoRelativePath(relativePath);
  return normalized.startsWith('src/') && HOTSPOT_FILE_EXTENSIONS.has(path.extname(normalized));
}

function countImports(content: string): number {
  return content.split('\n').filter((line) => /^\s*import\s+/.test(line)).length;
}

function countMatches(content: string, pattern: RegExp): number {
  return (content.match(pattern) ?? []).length;
}

function scoreFile(content: string): { score: number; reasons: string[]; lineCount: number; importCount: number } {
  const lineCount = content.replace(/\r\n/g, '\n').split('\n').length;
  const importCount = countImports(content);
  const routeSignals = countMatches(content, /\b(router|route|req|res|request|response|controller)\b/g);
  const persistenceSignals = countMatches(content, /\b(sql|query|db|database|repository|persist)\b/g);
  const complexitySignals = countMatches(content, /\b(if|switch|catch|throw|await)\b/g);

  const reasons: string[] = [];
  let score = 0;

  if (lineCount >= 80) {
    score += Math.min(6, Math.floor(lineCount / 40));
    reasons.push('oversized-file');
  }
  if (importCount >= 5) {
    score += Math.min(4, Math.floor(importCount / 3));
    reasons.push('high-coupling');
  }
  if (routeSignals > 0 && persistenceSignals > 0) {
    score += 5;
    reasons.push('mixed-transport-and-persistence');
  }
  if (complexitySignals >= 8) {
    score += 3;
    reasons.push('high-branching-density');
  }

  return {
    score,
    reasons,
    lineCount,
    importCount
  };
}

async function buildHotspotRecord(repoRoot: string, relativePath: string): Promise<HotspotRecord | null> {
  const fullPath = resolveRepoPath(repoRoot, relativePath);
  const content = await fs.readFile(fullPath, 'utf8');
  const scored = scoreFile(content);
  if (scored.score <= 0) {
    return null;
  }

  return {
    path: relativePath,
    score: scored.score,
    reasons: [...new Set(scored.reasons)].sort((left, right) => left.localeCompare(right)),
    line_count: scored.lineCount,
    import_count: scored.importCount
  };
}

function buildHotspotRecordFromContent(relativePath: string, content: string): HotspotRecord | null {
  const scored = scoreFile(content);
  if (scored.score <= 0) {
    return null;
  }

  return {
    path: relativePath,
    score: scored.score,
    reasons: [...new Set(scored.reasons)].sort((left, right) => left.localeCompare(right)),
    line_count: scored.lineCount,
    import_count: scored.importCount
  };
}

export async function detectHotspots(repoRoot: string, options: { limit?: number } = {}): Promise<HotspotRecord[]> {
  const files = await listFilesRecursive(repoRoot);
  const hotspots: HotspotRecord[] = [];

  for (const file of files) {
    if (!trackedSourceFile(file.relativePath)) {
      continue;
    }

    const hotspot = await buildHotspotRecord(repoRoot, normalizeRepoRelativePath(file.relativePath));
    if (hotspot) {
      hotspots.push(hotspot);
    }
  }

  return hotspots
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, options.limit ?? 5);
}

export function detectHotspotsFromSnapshot(snapshot: SnapshotLike, options: { limit?: number } = {}): HotspotRecord[] {
  const hotspots = snapshot.files
    .filter((file) => trackedSourceFile(file.path))
    .map((file) => buildHotspotRecordFromContent(file.path, file.content))
    .filter((entry): entry is HotspotRecord => Boolean(entry));

  return hotspots
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, options.limit ?? 5);
}

export async function evaluateHotspotImprovements(
  repoRoot: string,
  {
    before,
    after,
    touchedPaths
  }: {
    before: HotspotRecord[];
    after: HotspotRecord[];
    touchedPaths: string[];
  }
): Promise<HotspotImprovement[]> {
  const touched = new Set(touchedPaths.map((entry) => normalizeRepoRelativePath(entry)));
  const afterByPath = new Map(after.map((entry) => [entry.path, entry]));

  return before
    .filter((entry) => touched.has(entry.path))
    .map((entry) => {
      const afterEntry = afterByPath.get(entry.path);
      return {
        path: entry.path,
        hotspot_score_before: entry.score,
        hotspot_score_after: afterEntry?.score ?? 0,
        line_delta: (afterEntry?.line_count ?? 0) - entry.line_count,
        import_delta: (afterEntry?.import_count ?? 0) - entry.import_count,
        improved: (afterEntry?.score ?? 0) < entry.score
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}
