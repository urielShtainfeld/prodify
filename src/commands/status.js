import { resolveRepoRoot } from '../core/repo-root.js';
import { inspectRepositoryStatus, renderStatusReport } from '../core/status.js';

export async function runStatusCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd,
    allowBootstrap: true
  });
  const report = await inspectRepositoryStatus(repoRoot);

  context.stdout.write(`${renderStatusReport(report)}\n`);
  return report.ok ? 0 : 1;
}
