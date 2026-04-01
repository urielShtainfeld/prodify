import { runDoctorCommand } from './commands/doctor.js';
import { runInitCommand } from './commands/init.js';
import { runInstallCommand } from './commands/install.js';
import { runStatusCommand } from './commands/status.js';
import { runSyncCommand } from './commands/sync.js';
import { runUpdateCommand } from './commands/update.js';
import { ProdifyError, toErrorMessage } from './core/errors.js';
import type { CommandContext, CommandHandler } from './types.js';

export const COMMANDS: Record<string, CommandHandler> = {
  init: runInitCommand,
  status: runStatusCommand,
  doctor: runDoctorCommand,
  update: runUpdateCommand,
  install: runInstallCommand,
  sync: runSyncCommand
};

export const PUBLIC_COMMANDS = ['init', 'status', 'doctor', 'update'] as const;
export const LEGACY_COMMANDS = ['install', 'sync'] as const;

export function renderHelp(): string {
  return [
    'Prodify CLI',
    '',
    'Usage:',
    '  prodify init',
    '  prodify status',
    '  prodify doctor',
    '  prodify update',
    '',
    'The primary flow is .prodify-first and contract-driven.'
  ].join('\n');
}

function isLegacyCommand(commandName: string): boolean {
  return (LEGACY_COMMANDS as readonly string[]).includes(commandName);
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
    if (isLegacyCommand(commandName)) {
      stderr.write(`Deprecated command: prodify ${commandName}. Use the .prodify-only flow: init, status, doctor, update.\n`);
    }

    return await command(rest, { cwd, stdout, stderr });
  } catch (error) {
    const message = toErrorMessage(error);
    stderr.write(`${message}\n`);
    return error instanceof ProdifyError ? error.exitCode : 1;
  }
}
