import fs from 'node:fs/promises';
import { resolveCanonicalPath } from './paths.js';
function extractSection(markdown, heading) {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const match = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'm').exec(normalized);
    return match?.[1]?.trim() ?? '';
}
function normalizePlanUnits(section) {
    const lines = section.split('\n');
    const units = [];
    let currentId = null;
    let currentDescription = '';
    let currentFiles = [];
    for (const rawLine of lines) {
        const line = rawLine.trim();
        const idMatch = /^-\s+Step ID:\s+(.+)$/.exec(line);
        if (idMatch) {
            if (currentId) {
                units.push({
                    id: currentId,
                    description: currentDescription,
                    files: currentFiles
                });
            }
            currentId = idMatch[1].trim();
            currentDescription = '';
            currentFiles = [];
            continue;
        }
        if (!currentId) {
            continue;
        }
        const descriptionMatch = /^-\s+Description:\s+(.+)$/.exec(line);
        if (descriptionMatch) {
            currentDescription = descriptionMatch[1].trim();
            continue;
        }
        const filesMatch = /^-\s+Files:\s+(.+)$/.exec(line);
        if (filesMatch) {
            currentFiles = filesMatch[1]
                .split(',')
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0);
        }
    }
    if (currentId) {
        units.push({
            id: currentId,
            description: currentDescription,
            files: currentFiles
        });
    }
    return units;
}
export async function readPlanUnits(repoRoot) {
    const planPath = resolveCanonicalPath(repoRoot, '.prodify/artifacts/04-plan.md');
    const markdown = await fs.readFile(planPath, 'utf8');
    return normalizePlanUnits(extractSection(markdown, 'Step Breakdown'));
}
export async function readSelectedRefactorStep(repoRoot) {
    const refactorPath = resolveCanonicalPath(repoRoot, '.prodify/artifacts/05-refactor.md');
    const markdown = await fs.readFile(refactorPath, 'utf8');
    const section = extractSection(markdown, 'Selected Step');
    if (!section) {
        return null;
    }
    const id = /-\s+Step ID:\s+(.+)/.exec(section)?.[1]?.trim() ?? null;
    const description = /-\s+Description:\s+(.+)/.exec(section)?.[1]?.trim() ?? '';
    const filesSection = extractSection(markdown, 'Changed Files');
    const files = filesSection
        .split('\n')
        .map((line) => /^-\s+(.+)$/.exec(line.trim())?.[1]?.trim() ?? null)
        .filter((line) => Boolean(line));
    if (!id) {
        return null;
    }
    return {
        id,
        description,
        files
    };
}
