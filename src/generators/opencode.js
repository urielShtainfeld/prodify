import { buildManagedMarkdownOutput, readCanonicalMarkdown } from './shared.js';
import { TARGET_DEFINITIONS } from '../core/paths.js';

export async function generateOpenCodeContent(repoRoot) {
  const target = TARGET_DEFINITIONS.opencode;
  const body = await readCanonicalMarkdown(repoRoot, target.canonicalSources[0]);

  return buildManagedMarkdownOutput({
    agent: target.agent,
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify sync --agent opencode',
    body
  });
}
