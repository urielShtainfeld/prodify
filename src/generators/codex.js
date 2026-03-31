import fs from 'node:fs/promises';

import { ProdifyError } from '../core/errors.js';
import { TARGET_DEFINITIONS, resolveCanonicalPath } from '../core/paths.js';
import { renderManagedFileHeader } from './header.js';

export async function generateCodexContent(repoRoot) {
  const target = TARGET_DEFINITIONS.codex;
  const canonicalPath = resolveCanonicalPath(repoRoot, target.canonicalSources[0]);

  let canonicalBody;
  try {
    canonicalBody = await fs.readFile(canonicalPath, 'utf8');
  } catch {
    throw new ProdifyError(`Canonical source is missing: ${target.canonicalSources[0]}`, {
      code: 'CANONICAL_SOURCE_MISSING'
    });
  }

  const header = renderManagedFileHeader({
    agent: 'codex',
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify sync --agent codex'
  });

  return `${header}\n\n${canonicalBody}`;
}
