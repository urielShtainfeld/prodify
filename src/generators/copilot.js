import { buildManagedMarkdownOutput, readCanonicalMarkdown, stripLeadingTitle } from './shared.js';
import { TARGET_DEFINITIONS } from '../core/paths.js';

export async function generateCopilotContent(repoRoot) {
  const target = TARGET_DEFINITIONS.copilot;
  const agentsMarkdown = await readCanonicalMarkdown(repoRoot, '.prodify/AGENTS.md');
  const projectMarkdown = await readCanonicalMarkdown(repoRoot, '.prodify/project.md');

  const body = [
    '# Copilot Instructions',
    '',
    '## Project Context',
    '',
    stripLeadingTitle(projectMarkdown),
    '',
    '## Operating Guidance',
    '',
    stripLeadingTitle(agentsMarkdown)
  ].join('\n').trimEnd() + '\n';

  return buildManagedMarkdownOutput({
    agent: target.agent,
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify sync --agent copilot',
    body
  });
}
