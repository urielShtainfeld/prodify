#!/usr/bin/env node
import { runCli } from './cli.js';
import type { CommandContext } from './types.js';

const context: CommandContext = {
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr
};

const exitCode = await runCli(process.argv.slice(2), context);

process.exitCode = exitCode;
