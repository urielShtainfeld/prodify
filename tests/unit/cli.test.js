import test from 'node:test';
import assert from 'node:assert/strict';

import { COMMANDS, PUBLIC_COMMANDS, renderHelp, runCli } from '../../dist/cli.js';
import { memoryStream } from './helpers.js';

test('cli help includes all command names', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const exitCode = await runCli(['--help'], { cwd: process.cwd(), stdout, stderr });

  assert.equal(exitCode, 0);
  assert.match(stdout.toString(), /\binit\b/);
  assert.match(stdout.toString(), /\bstatus\b/);
  assert.match(stdout.toString(), /\bdoctor\b/);
  assert.match(stdout.toString(), /\bupdate\b/);
  assert.doesNotMatch(stdout.toString(), /\binstall\b/);
  assert.doesNotMatch(stdout.toString(), /\bsync\b/);
});

test('command registry keeps legacy shims but exposes the lifecycle commands publicly', () => {
  assert.deepEqual(PUBLIC_COMMANDS, ['init', 'status', 'doctor', 'update']);
  assert.deepEqual(Object.keys(COMMANDS).sort(), ['doctor', 'init', 'install', 'status', 'sync', 'update']);
  assert.match(renderHelp(), /prodify status/);
  assert.match(renderHelp(), /prodify update/);
});
