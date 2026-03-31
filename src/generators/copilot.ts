import { buildManagedMarkdownOutput, readCanonicalMarkdown, stripLeadingTitle } from './shared.js';
import { LEGACY_TARGET_PATH_DEFINITIONS } from '../core/paths.js';

export async function generateCopilotContent(repoRoot: string): Promise<string> {
  const target = LEGACY_TARGET_PATH_DEFINITIONS.copilot;
  const agentsMarkdown = await readCanonicalMarkdown(repoRoot, '.prodify/AGENTS.md');
  const projectMarkdown = await readCanonicalMarkdown(repoRoot, '.prodify/project.md');
  const runtimeMarkdown = await readCanonicalMarkdown(repoRoot, '.prodify/runtime-commands.md');

  const body = [
    '# Copilot Instructions',
    '',
    '## Project Context',
    '',
    stripLeadingTitle(projectMarkdown),
    '',
    '## Operating Guidance',
    '',
    stripLeadingTitle(agentsMarkdown),
    '',
    '## Runtime Commands',
    '',
    stripLeadingTitle(runtimeMarkdown)
  ].join('\n').trimEnd() + '\n';

  return buildManagedMarkdownOutput({
    agent: target.agent,
    canonicalSources: target.canonicalSources,
    regenerateCommand: 'prodify update',
    body
  });
}
