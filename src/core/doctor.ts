import fs from 'node:fs/promises';

import { REQUIRED_CANONICAL_PATHS, resolveCanonicalPath, resolveRepoPath } from './paths.js';
import { pathExists } from './fs.js';
import { readRuntimeState } from './state.js';
import { inspectVersionStatus } from './version-checks.js';
import { loadDefaultPreset } from '../presets/loader.js';
import { parseVersionMetadata } from '../presets/version.js';
import { hasManualBootstrapGuidance } from './prompt-builder.js';
import { inspectCompiledContracts } from '../contracts/compiler.js';
import type { DoctorCheck, DoctorResult } from '../types.js';

function isProdifyDirectoryIgnore(pattern: string): boolean {
  const trimmed = pattern.trim();
  return trimmed === '.prodify'
    || trimmed === '.prodify/'
    || trimmed === '/.prodify'
    || trimmed === '/.prodify/';
}

async function inspectGitignore(repoRoot: string): Promise<DoctorCheck> {
  const gitignorePath = resolveRepoPath(repoRoot, '.gitignore');
  if (!(await pathExists(gitignorePath))) {
    return {
      label: 'gitignore/prodify',
      ok: true,
      details: '.gitignore does not hide .prodify/'
    };
  }

  const content = await fs.readFile(gitignorePath, 'utf8');
  const badPatterns = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .filter(isProdifyDirectoryIgnore);

  return {
    label: 'gitignore/prodify',
    ok: badPatterns.length === 0,
    details: badPatterns.length === 0
      ? '.gitignore does not ignore .prodify/'
      : `bad patterns found: ${badPatterns.join(', ')}`
  };
}

async function inspectBootstrapGuidance(repoRoot: string): Promise<DoctorCheck> {
  const guidancePath = resolveCanonicalPath(repoRoot, '.prodify/AGENTS.md');
  if (!(await pathExists(guidancePath))) {
    return {
      label: 'bootstrap/guidance',
      ok: false,
      details: '.prodify/AGENTS.md is missing'
    };
  }

  const guidance = await fs.readFile(guidancePath, 'utf8');
  return {
    label: 'bootstrap/guidance',
    ok: hasManualBootstrapGuidance(guidance),
    details: hasManualBootstrapGuidance(guidance)
      ? 'manual agent entry is documented in .prodify/AGENTS.md'
      : '.prodify/AGENTS.md does not contain the manual bootstrap instruction'
  };
}

export async function runDoctor(repoRoot: string): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];
  const preset = await loadDefaultPreset();
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

  const contractInventory = await inspectCompiledContracts(repoRoot);
  checks.push({
    label: 'contracts/source',
    ok: contractInventory.missingSourceStages.length === 0 && contractInventory.invalidStages.length === 0,
    details: contractInventory.missingSourceStages.length === 0
      ? `source contracts detected: ${contractInventory.sourceCount}`
      : `missing source contracts: ${contractInventory.missingSourceStages.join(', ')}`
  });
  checks.push({
    label: 'contracts/compiled',
    ok: contractInventory.ok,
    details: contractInventory.ok
      ? `compiled contracts synchronized: ${contractInventory.compiledCount}`
      : [
        contractInventory.missingCompiledStages.length > 0 ? `missing compiled: ${contractInventory.missingCompiledStages.join(', ')}` : '',
        contractInventory.staleStages.length > 0 ? `stale: ${contractInventory.staleStages.join(', ')}` : '',
        contractInventory.invalidStages.length > 0 ? `invalid: ${contractInventory.invalidStages.join(', ')}` : ''
      ].filter(Boolean).join('; ')
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

  const versionStatus = await inspectVersionStatus(repoRoot, preset.metadata);
  checks.push({
    label: 'canonical/schema',
    ok: versionStatus.status === 'current',
    details: versionStatus.status === 'current'
      ? `preset ${preset.metadata.name}@${preset.metadata.version} matches`
      : `version status is ${versionStatus.status}`
  });

  try {
    await readRuntimeState(repoRoot, {
      presetMetadata: preset.metadata
    });
    checks.push({
      label: 'runtime/state',
      ok: true,
      details: '.prodify/state.json is readable'
    });
  } catch {
    checks.push({
      label: 'runtime/state',
      ok: false,
      details: '.prodify/state.json is missing or malformed'
    });
  }

  checks.push(await inspectGitignore(repoRoot));
  checks.push(await inspectBootstrapGuidance(repoRoot));

  return {
    ok: checks.every((check) => check.ok || check.skipped === true),
    checks
  };
}
