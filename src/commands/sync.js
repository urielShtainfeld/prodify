import { resolveRepoRoot } from '../core/repo-root.js';
import { syncManagedTargets } from '../core/sync.js';

function parseAgent(args) {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1) {
    return null;
  }

  return args[agentFlagIndex + 1] ?? null;
}

function hasForceFlag(args) {
  return args.includes('--force');
}

export async function runSyncCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const results = await syncManagedTargets(repoRoot, {
    agent: parseAgent(args),
    force: hasForceFlag(args)
  });

  if (results.length === 0) {
    context.stdout.write('sync: no managed targets found\n');
    return 0;
  }

  for (const result of results) {
    context.stdout.write(`sync ${result.agent}: ${result.status} ${result.targetPath}\n`);
  }

  return 0;
}
