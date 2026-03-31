import { resolveRepoRoot } from '../core/repo-root.js';
import { installTarget } from '../core/install.js';
import { ProdifyError } from '../core/errors.js';
import type { CommandContext } from '../types.js';

function parseAgent(args: string[]): string {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1 || !args[agentFlagIndex + 1]) {
    throw new ProdifyError('install requires --agent <target>.', {
      code: 'AGENT_REQUIRED'
    });
  }

  return args[agentFlagIndex + 1];
}

function hasForceFlag(args: string[]): boolean {
  return args.includes('--force');
}

export async function runInstallCommand(args: string[], context: CommandContext): Promise<number> {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const agent = parseAgent(args);
  const result = await installTarget(repoRoot, agent, {
    force: hasForceFlag(args)
  });

  const statusSuffix = result.status === 'supported' ? '' : ` (${result.status})`;
  context.stdout.write(`legacy compatibility install ${result.agent}${statusSuffix}: updated ${result.targetPath}\n`);
  return 0;
}
