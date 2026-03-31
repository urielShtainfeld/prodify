import fs from 'node:fs/promises';

import { detectManagedFileState, parseManagedFileHeader } from './managed-files.js';
import { REQUIRED_CANONICAL_PATHS, resolveCanonicalPath, resolveRepoPath, resolveTargetPath } from './paths.js';
import { pathExists } from './fs.js';
import { listRegisteredTargets } from './targets.js';
import { parseVersionMetadata } from '../presets/version.js';

export async function runDoctor(repoRoot) {
  const checks = [];
  const prodifyPath = resolveRepoPath(repoRoot, '.prodify');
  const prodifyExists = await pathExists(prodifyPath);
  if (!prodifyExists) {
    checks.push({
      label: 'canonical',
      ok: false,
      details: '.prodify/ is missing'
    });

    return {
      ok: false,
      checks
    };
  }

  const missingCanonicalFiles = [];
  for (const relativePath of REQUIRED_CANONICAL_PATHS) {
    if (!(await pathExists(resolveCanonicalPath(repoRoot, relativePath)))) {
      missingCanonicalFiles.push(relativePath);
    }
  }

  checks.push({
    label: 'canonical',
    ok: missingCanonicalFiles.length === 0,
    details: missingCanonicalFiles.length === 0
      ? 'required canonical files verified'
      : `missing canonical files: ${missingCanonicalFiles.join(', ')}`
  });

  const versionPath = resolveCanonicalPath(repoRoot, '.prodify/version.json');
  if (await pathExists(versionPath)) {
    try {
      parseVersionMetadata(await fs.readFile(versionPath, 'utf8'));
      checks.push({
        label: 'canonical/version',
        ok: true,
        details: 'version metadata is readable'
      });
    } catch {
      checks.push({
        label: 'canonical/version',
        ok: false,
        details: '.prodify/version.json is malformed'
      });
    }
  }

  for (const target of listRegisteredTargets()) {
    if (!target.doctorEligible) {
      continue;
    }

    const targetPath = resolveTargetPath(repoRoot, target.agent);
    const exists = await pathExists(targetPath);

    if (!exists) {
      checks.push({
        label: `compatibility/${target.agent}`,
        ok: true,
        skipped: true,
        details: `${target.status} target not installed`
      });
      continue;
    }

    const existingContent = await fs.readFile(targetPath, 'utf8');
    const header = parseManagedFileHeader(existingContent);
    const isManaged = header?.targetAgent === target.agent;

    checks.push({
      label: `compatibility/${target.agent}`,
      ok: isManaged,
      details: isManaged ? `managed file detected at ${target.targetPath}` : `${target.targetPath} exists but is not Prodify-managed`
    });

    if (isManaged && target.enabled && target.generator) {
      const expectedContent = await target.generator(repoRoot);
      const state = detectManagedFileState(existingContent, expectedContent);
      const driftOk = state.state === 'unchanged';
      let details = 'generated file matches canonical source';

      if (state.state === 'outdated') {
        details = 'managed file drifted from canonical output';
      } else if (state.state === 'conflict') {
        details = 'managed file has manual edits';
      }

      checks.push({
        label: `drift/${target.targetPath}`,
        ok: driftOk,
        details
      });
    } else if (isManaged) {
      checks.push({
        label: `drift/${target.targetPath}`,
        ok: false,
        details: `${target.agent} is not enabled for doctor generation`
      });
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}
