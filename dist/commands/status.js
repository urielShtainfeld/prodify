import { resolveRepoRoot } from '../core/repo-root.js';
import { inspectRepositoryStatus, renderStatusReportWithMode } from '../core/status.js';
import { ProdifyError } from '../core/errors.js';
import { getRuntimeProfile } from '../core/targets.js';
function parseRequestedAgent(args) {
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
function parseStatusMode(args) {
    const wantsJson = args.includes('--json');
    const wantsVerbose = args.includes('--verbose');
    const wantsCompact = args.includes('--compact');
    const modeCount = [wantsJson, wantsVerbose, wantsCompact].filter(Boolean).length;
    if (modeCount > 1) {
        throw new ProdifyError('status accepts only one of --json, --compact, or --verbose.', {
            code: 'INVALID_STATUS_MODE'
        });
    }
    if (wantsJson) {
        return 'json';
    }
    if (wantsVerbose) {
        return 'verbose';
    }
    return 'compact';
}
export async function runStatusCommand(args, context) {
    const repoRoot = await resolveRepoRoot({
        cwd: context.cwd,
        allowBootstrap: true
    });
    const report = await inspectRepositoryStatus(repoRoot, {
        agent: parseRequestedAgent(args)
    });
    context.stdout.write(`${renderStatusReportWithMode(report, parseStatusMode(args))}\n`);
    return report.ok ? 0 : 1;
}
