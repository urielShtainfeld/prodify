import { writeFileEnsuringDir } from '../core/fs.js';
import { resolveRepoRoot } from '../core/repo-root.js';
import { resolveRepoPath } from '../core/paths.js';
import { pathExists } from '../core/fs.js';
import { ProdifyError } from '../core/errors.js';
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
    context.stdout.write(`Initialized Prodify in ${repoRoot}\n`);
    context.stdout.write('Manual bootstrap starts by telling your agent to read .prodify/AGENTS.md\n');
    context.stdout.write('Compiled runtime contracts were generated under .prodify/contracts/\n');
    return 0;
}
