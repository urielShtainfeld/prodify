import { resolveRepoRoot } from '../core/repo-root.js';
import { updateProdifySetup } from '../core/upgrade.js';

export async function runUpdateCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd
  });
  const summary = await updateProdifySetup(repoRoot);

  context.stdout.write('Prodify Update\n');
  context.stdout.write(`Version/schema: ${summary.versionStatus}\n`);
  if (summary.schemaMigrationRequired) {
    context.stdout.write('Schema migration: applied\n');
  }

  context.stdout.write(`Canonical assets: ${summary.writtenCanonicalCount} written, ${summary.preservedCanonicalCount} preserved\n`);
  context.stdout.write(`Generated adapters: ${summary.updatedTargets.length} updated`);
  if (summary.skippedTargets.length > 0) {
    context.stdout.write(`, ${summary.skippedTargets.length} skipped`);
  }
  context.stdout.write('\n');

  return summary.skippedTargets.some((target) => target.status === 'skipped-unmanaged') ? 1 : 0;
}
