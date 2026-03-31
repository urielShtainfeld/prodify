import { resolveRepoRoot } from '../core/repo-root.js';
import { syncManagedTargets } from '../core/sync.js';
import type { CommandContext } from '../types.js';

function parseAgent(args: string[]): string | null {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1) {
    return null;
  }

  return args[agentFlagIndex + 1] ?? null;
}

function hasForceFlag(args: string[]): boolean {
  return args.includes('--force');
}

export async function runSyncCommand(args: string[], context: CommandContext): Promise<number> {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const results = await syncManagedTargets(repoRoot, {
    agent: parseAgent(args),
    force: hasForceFlag(args)
  });

  if (results.length === 0) {
    context.stdout.write('legacy compatibility sync: no managed targets found\n');
    return 0;
  }

  for (const result of results) {
    context.stdout.write(`legacy sync ${result.agent}: ${result.status} ${result.targetPath}\n`);
  }

  return 0;
}
