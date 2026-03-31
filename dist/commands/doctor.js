import { resolveRepoRoot } from '../core/repo-root.js';
import { runDoctor } from '../core/doctor.js';
export async function runDoctorCommand(args, context) {
    void args;
    const repoRoot = await resolveRepoRoot({
        cwd: context.cwd,
        allowBootstrap: true
    });
    const result = await runDoctor(repoRoot);
    context.stdout.write('Prodify Doctor\n');
    for (const check of result.checks) {
        const status = check.skipped ? 'SKIP' : check.ok ? 'PASS' : 'FAIL';
        context.stdout.write(`${check.label}: ${status}${check.details ? ` - ${check.details}` : ''}\n`);
    }
    return result.ok ? 0 : 1;
}
