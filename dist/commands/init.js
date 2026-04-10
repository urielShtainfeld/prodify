import { writeFileEnsuringDir } from '../core/fs.js';
import { resolveRepoRoot } from '../core/repo-root.js';
import { resolveRepoPath } from '../core/paths.js';
import { pathExists } from '../core/fs.js';
import { ProdifyError } from '../core/errors.js';
import { syncProdifyGitignore } from '../core/gitignore.js';
import { createInitialRuntimeState, writeRuntimeState } from '../core/state.js';
import { loadDefaultPreset } from '../presets/loader.js';
import { synchronizeRuntimeContracts } from '../contracts/compiler.js';
export async function runInitCommand(args, context) {
    void args;
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
    await synchronizeRuntimeContracts(repoRoot);
    await writeRuntimeState(repoRoot, createInitialRuntimeState({
        presetMetadata: preset.metadata
    }));
    const gitignore = await syncProdifyGitignore(repoRoot);
    context.stdout.write(`Initialized Prodify in ${repoRoot}\n`);
    context.stdout.write('Global agent setup is separate: run `prodify setup-agent <agent>` once per machine before using `$prodify-*` commands inside that agent\n');
    context.stdout.write('Default inside-agent bootstrap: open a configured agent in this repo and run `$prodify-init`\n');
    context.stdout.write('Compact runtime bootstrap was generated under `.prodify/runtime/bootstrap.json`\n');
    context.stdout.write('Compiled runtime contracts were generated under .prodify/contracts/\n');
    context.stdout.write(`Gitignore: ${gitignore.updated ? 'updated' : 'already current'} at .gitignore\n`);
    for (const warning of gitignore.warnings) {
        context.stdout.write(`Warning: ${warning}\n`);
    }
    return 0;
}
