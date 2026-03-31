import { buildManagedMarkdownOutput, readCanonicalMarkdown } from './shared.js';
import { TARGET_DEFINITIONS } from '../core/paths.js';

export async function generateClaudeContent(repoRoot) {
  const target = TARGET_DEFINITIONS.claude;
  const guidance = await readCanonicalMarkdown(repoRoot, target.canonicalSources[0]);
  const runtime = await readCanonicalMarkdown(repoRoot, '.prodify/runtime-commands.md');
  const body = `${guidance.trimEnd()}\n\n${runtime.trim()}\n`;

  return buildManagedMarkdownOutput({
    agent: target.agent,
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify update',
    body
  });
}
