import { resolveRepoRoot } from '../core/repo-root.js';
import { updateProdifySetup } from '../core/upgrade.js';
export async function runUpdateCommand(args, context) {
    void args;
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
    context.stdout.write(`Compiled contracts: ${summary.compiledContractCount}\n`);
    context.stdout.write('Legacy compatibility adapters: not part of the default flow\n');
    return 0;
}
