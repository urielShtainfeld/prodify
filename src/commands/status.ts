import { resolveRepoRoot } from '../core/repo-root.js';
import { inspectRepositoryStatus, renderStatusReport } from '../core/status.js';
import { ProdifyError } from '../core/errors.js';
import { getRuntimeProfile } from '../core/targets.js';
import type { CommandContext } from '../types.js';

function parseRequestedAgent(args: string[]): string | null {
  const agentFlagIndex = args.indexOf('--agent');
  if (agentFlagIndex === -1) {
    return null;
  }

  const value = args[agentFlagIndex + 1] ?? null;
  if (!value || !getRuntimeProfile(value)) {
    throw new ProdifyError('status requires --agent <codex|claude|copilot|opencode> when an agent is specified.', {
      code: 'INVALID_AGENT'
    });
  }

  return value;
}

export async function runStatusCommand(args: string[], context: CommandContext): Promise<number> {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd,
    allowBootstrap: true
  });
  const report = await inspectRepositoryStatus(repoRoot, {
    agent: parseRequestedAgent(args)
  });

  context.stdout.write(`${renderStatusReport(report)}\n`);
  return report.ok ? 0 : 1;
}
