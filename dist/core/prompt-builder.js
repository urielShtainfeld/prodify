import { STAGE_ORDER, stageToTaskId } from './flow-state.js';
import { getRuntimeProfile } from './targets.js';
export function buildBootstrapPrompt(profileName = 'codex') {
    return (getRuntimeProfile(profileName ?? 'codex') ?? getRuntimeProfile('codex')).bootstrapPrompt;
}
export function hasManualBootstrapGuidance(markdown) {
    return markdown.includes('$prodify-init') && (markdown.includes('.prodify/runtime/bootstrap.json') || markdown.includes('.prodify/AGENTS.md'));
}
export function buildRuntimeCommandReference(options = {}) {
    const concise = options.concise ?? false;
    const profile = getRuntimeProfile(options.profileName ?? 'codex') ?? getRuntimeProfile('codex');
    const bootstrapPrompt = profile?.bootstrapPrompt ?? buildBootstrapPrompt('codex');
    const lines = [
        '# Runtime Commands',
        '',
        'Default bootstrap:',
        `- ${bootstrapPrompt}`,
        '- Before using `$prodify-*` in a new agent environment, run `prodify setup-agent <agent>` once outside the repo.',
        '- Keep the workflow anchored to `.prodify/` files only.',
        '- Humans edit `.prodify/contracts-src/`; runtime reads only `.prodify/contracts/*.contract.json`.',
        '- Stage skill definitions live under `.prodify/skills/` and can assist a stage without overriding its contract or validator.',
        '- Canonical machine bootstrap input: `.prodify/runtime/bootstrap.json`.',
        '- Compatibility pointer for humans: `.prodify/AGENTS.md`.',
        '',
        'Run these commands inside your coding agent after `prodify init` has created the repo scaffolding.',
        '',
        '- `$prodify-init`: locate the repo root, read `.prodify/runtime/bootstrap.json`, detect or resolve the active agent runtime, initialize `.prodify/state.json`, and prepare the bootstrapped state.',
        '- `$prodify-execute`: run one stage, write stage artifacts, validate them against compiled contracts, then pause in interactive mode.',
        '- `$prodify-execute --auto`: continue through the full workflow without pausing unless there is a hard failure, policy block, required approval threshold, or invalid state.',
        '- `$prodify-resume`: continue from `.prodify/state.json` after a pause, interruption, or validation checkpoint.',
        '',
        'Stage order:',
        `- ${STAGE_ORDER.map((stage) => `${stage} (${stageToTaskId(stage)})`).join(' -> ')}`,
        '',
        'Resume rules:',
        '- interactive mode pauses between stages and expects validation before resume',
        '- auto mode keeps advancing while state remains valid',
        '- failed or corrupt state must stop with a clear reason'
    ];
    if (concise) {
        return [
            '# Runtime Commands',
            '',
            `- Bootstrap: ${bootstrapPrompt}`,
            '- Run `prodify setup-agent <agent>` once per machine before using agent runtime commands.',
            '- `$prodify-init`: bootstrap from `.prodify/runtime/bootstrap.json` and `.prodify/state.json`.',
            '- `$prodify-execute`: run one stage, then pause.',
            '- `$prodify-execute --auto`: continue until a hard stop.',
            '- `$prodify-resume`: continue from saved state.'
        ].join('\n') + '\n';
    }
    return `${lines.join('\n')}\n`;
}
export function buildExecutionPrompt(state) {
    const stage = state.runtime.current_stage ?? state.runtime.pending_stage ?? 'none';
    const task = state.runtime.current_task_id ?? (state.runtime.pending_stage ? stageToTaskId(state.runtime.pending_stage) : 'none');
    return [
        `Current stage: ${stage}`,
        `Current task: ${task}`,
        `Current state: ${state.runtime.current_state}`,
        `Mode: ${state.runtime.mode ?? 'unset'}`,
        `Status: ${state.runtime.status}`,
        `Next action: ${state.runtime.next_action}`
    ].join('\n');
}
