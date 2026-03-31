import fs from 'node:fs/promises';

import { ProdifyError } from '../core/errors.js';
import { resolveCanonicalPath } from '../core/paths.js';
import { computeBodyFingerprint } from '../core/managed-files.js';
import { renderManagedFileHeader } from './header.js';
import type { RuntimeProfileName } from '../types.js';

export async function readCanonicalMarkdown(repoRoot: string, relativePath: string): Promise<string> {
  const absolutePath = resolveCanonicalPath(repoRoot, relativePath);

  try {
    return await fs.readFile(absolutePath, 'utf8');
  } catch {
    throw new ProdifyError(`Canonical source is missing: ${relativePath}`, {
      code: 'CANONICAL_SOURCE_MISSING'
    });
  }
}

export function stripLeadingTitle(markdown: string): string {
  const lines = markdown.split('\n');

  if (lines[0]?.startsWith('# ')) {
    let index = 1;
    while (index < lines.length && lines[index].trim() === '') {
      index += 1;
    }

    return lines.slice(index).join('\n').trim();
  }

  return markdown.trim();
}

export function buildManagedMarkdownOutput({
  agent,
  canonicalSources,
  regenerateCommand,
  body
}: {
  agent: RuntimeProfileName;
  canonicalSources: readonly string[];
  regenerateCommand: string;
  body: string;
}): string {
  const bodyFingerprint = computeBodyFingerprint(body);
  const header = renderManagedFileHeader({
    agent,
    canonicalSources,
    regenerateCommand,
    bodyFingerprint
  });

  return `${header}\n\n${body}`;
}
