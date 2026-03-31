import { STAGE_ORDER, stageToTaskId } from './flow-state.js';
import { getRuntimeProfile } from './targets.js';
export function buildBootstrapPrompt(profileName = 'codex') {
    return (getRuntimeProfile(profileName ?? 'codex') ?? getRuntimeProfile('codex')).bootstrapPrompt;
}
export function hasManualBootstrapGuidance(markdown) {
    return markdown.includes('.prodify/AGENTS.md') && markdown.includes('$prodify-init');
}
export function buildRuntimeCommandReference(options = {}) {
    const concise = options.concise ?? false;
    const profile = getRuntimeProfile(options.profileName ?? 'codex') ?? getRuntimeProfile('codex');
    const bootstrapPrompt = profile?.bootstrapPrompt ?? buildBootstrapPrompt('codex');
    const lines = [
        '# Runtime Commands',
        '',
        'Manual bootstrap:',
        `- First tell the agent: "${bootstrapPrompt}"`,
        '- Keep the workflow anchored to `.prodify/` files only.',
        '',
        'Run these commands inside your coding agent after `prodify init` has created the repo scaffolding.',
        '',
        '- `$prodify-init`: inspect `.prodify/`, select the active agent and runtime mode, initialize `.prodify/state.json`, and prepare `understand` as the first stage.',
        '- `$prodify-execute`: run one stage of the workflow in interactive mode, then pause for validation before the next stage.',
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
            `- First prompt: "${bootstrapPrompt}"`,
            '- `$prodify-init`: bootstrap `.prodify/state.json` for the chosen agent.',
            '- `$prodify-execute`: run one stage, then pause.',
            '- `$prodify-execute --auto`: continue until a hard stop.',
            '- `$prodify-resume`: continue from saved state.'
        ].join('\n') + '\n';
    }
    return `${lines.join('\n')}\n`;
}
export function buildExecutionPrompt(state) {
    return [
        `Current stage: ${state.runtime.current_stage ?? 'none'}`,
        `Current task: ${state.runtime.current_task_id ?? 'none'}`,
        `Mode: ${state.runtime.mode ?? 'unset'}`,
        `Status: ${state.runtime.status}`,
        `Next action: ${state.runtime.next_action}`
    ].join('\n');
}
