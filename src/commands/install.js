import { resolveRepoRoot } from '../core/repo-root.js';
import { installTarget } from '../core/install.js';
import { ProdifyError } from '../core/errors.js';

function parseAgent(args) {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1 || !args[agentFlagIndex + 1]) {
    throw new ProdifyError('install requires --agent <target>.', {
      code: 'AGENT_REQUIRED'
    });
  }

  return args[agentFlagIndex + 1];
}

function hasForceFlag(args) {
  return args.includes('--force');
}

export async function runInstallCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const agent = parseAgent(args);
  const result = await installTarget(repoRoot, agent, {
    force: hasForceFlag(args)
  });

  const statusSuffix = result.status === 'supported' ? '' : ` (${result.status})`;
  context.stdout.write(`installed ${result.agent}${statusSuffix}: updated ${result.targetPath}\n`);
  return 0;
}
