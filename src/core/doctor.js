import fs from 'node:fs/promises';

import { parseManagedFileHeader } from './managed-files.js';
import { REQUIRED_CANONICAL_PATHS, resolveCanonicalPath, resolveRepoPath, resolveTargetPath } from './paths.js';
import { pathExists } from './fs.js';
import { getEnabledGenerator } from './targets.js';

export async function runDoctor(repoRoot) {
  const checks = [];
  const prodifyPath = resolveRepoPath(repoRoot, '.prodify');
  const prodifyExists = await pathExists(prodifyPath);

  checks.push({
    label: 'canonical',
    ok: prodifyExists && (await Promise.all(REQUIRED_CANONICAL_PATHS.map((file) => pathExists(resolveCanonicalPath(repoRoot, file))))).every(Boolean),
    details: prodifyExists ? 'required canonical files verified' : '.prodify/ is missing'
  });

  const codexTargetPath = resolveTargetPath(repoRoot, 'codex');
  const codexExists = await pathExists(codexTargetPath);

  if (!codexExists) {
    checks.push({
      label: 'compatibility/codex',
      ok: true,
      skipped: true,
      details: 'Codex target not installed'
    });
  } else {
    const existingContent = await fs.readFile(codexTargetPath, 'utf8');
    const header = parseManagedFileHeader(existingContent);
    const isManaged = header?.targetAgent === 'codex';

    checks.push({
      label: 'compatibility/codex',
      ok: isManaged,
      details: isManaged ? 'managed file detected' : 'file exists but is not Prodify-managed'
    });

    if (isManaged) {
      const expected = await getEnabledGenerator('codex')(repoRoot);
      checks.push({
        label: 'drift/AGENTS.md',
        ok: existingContent === expected,
        details: existingContent === expected ? 'generated file matches canonical source' : 'managed file drift detected'
      });
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}
