import { runDoctorCommand } from './commands/doctor.js';
import { runInitCommand } from './commands/init.js';
import { runSetupAgentCommand } from './commands/setup-agent.js';
import { runStatusCommand } from './commands/status.js';
import { runUpdateCommand } from './commands/update.js';
import { ProdifyError, toErrorMessage } from './core/errors.js';
import type { CommandContext, CommandHandler } from './types.js';

export const COMMANDS: Record<string, CommandHandler> = {
  init: runInitCommand,
  'setup-agent': runSetupAgentCommand,
  status: runStatusCommand,
  doctor: runDoctorCommand,
  update: runUpdateCommand
};

export const PUBLIC_COMMANDS = ['init', 'setup-agent', 'status', 'doctor', 'update'] as const;

export function renderHelp(): string {
  return [
    'Prodify CLI',
    '',
    'Usage:',
    '  prodify setup-agent <codex|claude|copilot|opencode>',
    '  prodify init',
    '  prodify status [--compact|--json|--verbose]',
    '  prodify doctor',
    '  prodify update',
    '',
    'Global agent setup is separate from per-repository init.',
    'The primary flow is .prodify-first and contract-driven.'
  ].join('\n');
}

export async function runCli(argv: string[], context: Partial<CommandContext> = {}): Promise<number> {
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const cwd = context.cwd ?? process.cwd();

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    stdout.write(`${renderHelp()}\n`);
    return 0;
  }

  const [commandName, ...rest] = argv;
  const command = COMMANDS[commandName];

  if (!command) {
    stderr.write(`Unknown command: ${commandName}\n`);
    stderr.write(`${renderHelp()}\n`);
    return 1;
  }

  try {
    return await command(rest, { cwd, stdout, stderr });
  } catch (error) {
    const message = toErrorMessage(error);
    stderr.write(`${message}\n`);
    return error instanceof ProdifyError ? error.exitCode : 1;
  }
}
