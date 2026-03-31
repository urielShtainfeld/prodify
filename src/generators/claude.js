import { buildManagedMarkdownOutput, readCanonicalMarkdown } from './shared.js';
import { TARGET_DEFINITIONS } from '../core/paths.js';

export async function generateClaudeContent(repoRoot) {
  const target = TARGET_DEFINITIONS.claude;
  const body = await readCanonicalMarkdown(repoRoot, target.canonicalSources[0]);

  return buildManagedMarkdownOutput({
    agent: target.agent,
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify sync --agent claude',
    body
  });
}
