import { writeFileEnsuringDir } from '../core/fs.js';
import { resolveRepoRoot } from '../core/repo-root.js';
import { resolveRepoPath } from '../core/paths.js';
import { pathExists } from '../core/fs.js';
import { ProdifyError } from '../core/errors.js';
import { loadDefaultPreset } from '../presets/loader.js';
import { syncManagedTargets } from '../core/sync.js';

export async function runInitCommand(args, context) {
  const repoRoot = await resolveRepoRoot({
    cwd: context.cwd,
    allowBootstrap: true
  });
  const prodifyDir = resolveRepoPath(repoRoot, '.prodify');

  if (await pathExists(prodifyDir)) {
    throw new ProdifyError('.prodify/ already exists. init stops rather than merging existing canonical files.', {
      code: 'PRODIFY_ALREADY_EXISTS'
    });
  }

  const preset = await loadDefaultPreset();

  for (const entry of preset.entries) {
    await writeFileEnsuringDir(resolveRepoPath(repoRoot, entry.relativePath), entry.content);
  }

  await syncManagedTargets(repoRoot, {
    createMissing: true
  });

  context.stdout.write(`Initialized Prodify in ${repoRoot}\n`);
  context.stdout.write('Prepared runtime adapters for codex, claude, copilot, opencode\n');
  return 0;
}
