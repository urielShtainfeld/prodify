import { resolveRepoRoot } from '../core/repo-root.js';
import { syncManagedTargets } from '../core/sync.js';

function parseAgent(args) {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1) {
    return null;
  }

  return args[agentFlagIndex + 1] ?? null;
}

export async function runSyncCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const results = await syncManagedTargets(repoRoot, {
    agent: parseAgent(args)
  });

  if (results.length === 0) {
    context.stdout.write('No managed targets found.\n');
    return 0;
  }

  for (const result of results) {
    context.stdout.write(`${result.agent}: ${result.status}\n`);
  }

  return 0;
}
