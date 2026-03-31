import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMANDS, renderHelp, runCli } from '../../src/cli.js';
import { memoryStream } from './helpers.js';

test('cli help includes all command names', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const exitCode = await runCli(['--help'], { cwd: process.cwd(), stdout, stderr });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /\binit\b/);
  assert.match(stdout.toString(), /\binstall\b/);
  assert.match(stdout.toString(), /\bsync\b/);
  assert.match(stdout.toString(), /\bdoctor\b/);
});

test('command registry exposes the four primary commands', () => {
  assert.deepEqual(Object.keys(COMMANDS).sort(), ['doctor', 'init', 'install', 'sync']);
  assert.match(renderHelp(), /prodify install --agent <target>/);
});
