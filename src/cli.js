import { runDoctorCommand } from './commands/doctor.js';
import { runInitCommand } from './commands/init.js';
import { runInstallCommand } from './commands/install.js';
import { runSyncCommand } from './commands/sync.js';
import { ProdifyError, toErrorMessage } from './core/errors.js';

export const COMMANDS = {
  init: runInitCommand,
  install: runInstallCommand,
  sync: runSyncCommand,
  doctor: runDoctorCommand
};

export function renderHelp() {
  return [
    'Prodify CLI',
    '',
    'Usage:',
    '  prodify init',
    '  prodify install --agent <target>',
    '  prodify sync [--agent <target>]',
    '  prodify doctor'
  ].join('\n');
}

export async function runCli(argv, context = {}) {
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
