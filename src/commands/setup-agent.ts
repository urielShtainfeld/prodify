import { setupAgentIntegration } from '../core/agent-setup.js';
import { ProdifyError } from '../core/errors.js';
import type { CommandContext } from '../types.js';

function parseAgent(args: string[]): string {
  const agent = args[0] ?? null;
  if (!agent || args.length !== 1) {
    throw new ProdifyError('setup-agent requires exactly one argument: <codex|claude|copilot|opencode>.', {
      code: 'INVALID_AGENT'
    });
  }

  return agent;
}

export async function runSetupAgentCommand(args: string[], context: CommandContext): Promise<number> {
  const agent = parseAgent(args);
  const result = await setupAgentIntegration(agent);

  context.stdout.write('Prodify Agent Setup\n');
  context.stdout.write(`Agent: ${agent}\n`);
  context.stdout.write(`Status: ${result.alreadyConfigured ? 'already configured globally; refreshed' : 'configured globally'}\n`);
  context.stdout.write(`Configured agents: ${result.configuredAgents.join(', ')}\n`);
  context.stdout.write(`Registry: ${result.statePath}\n`);
  if (result.installedPaths.length > 0) {
    context.stdout.write(`Installed runtime commands: ${result.installedPaths.join(', ')}\n`);
  }
  context.stdout.write('Repo impact: none\n');
  context.stdout.write('Next step: run `prodify init` in a repository, then open that agent and use `$prodify-init`.\n');
  return 0;
}
