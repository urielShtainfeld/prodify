import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { bootstrapFlowState, startFlowExecution } from '../../dist/core/flow-state.js';
import { readRuntimeState, writeRuntimeState } from '../../dist/core/state.js';
import { createTempRepo, memoryStream } from '../unit/helpers.js';

const TARGET_PATHS = {
  codex: 'AGENTS.md',
  claude: 'CLAUDE.md',
  copilot: '.github/copilot-instructions.md',
  opencode: '.opencode/AGENTS.md'
};

async function execCli(repoRoot, args) {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const exitCode = await runCli(args, { cwd: repoRoot, stdout, stderr });

  return {
    exitCode,
    stdout: stdout.toString(),
    stderr: stderr.toString()
  };
}

async function readRepoFile(repoRoot, relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function assertMissing(repoRoot, relativePath) {
  await assert.rejects(fs.access(path.join(repoRoot, relativePath)));
}

test('status reports an uninitialized repo cleanly', async () => {
  const repoRoot = await createTempRepo();

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Repository: not initialized/);
  assert.match(result.stdout, /Recommended next action: prodify init/);
});

test('init creates only .prodify-owned runtime scaffolding', async () => {
  const repoRoot = await createTempRepo();

  const result = await execCli(repoRoot, ['init']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Initialized Prodify/);
  assert.match(result.stdout, /Manual bootstrap starts by telling your agent to read \.prodify\/AGENTS\.md/);
  assert.match(result.stdout, /Compiled runtime contracts were generated under \.prodify\/contracts\//);
  await fs.access(path.join(repoRoot, '.prodify', 'state.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime-commands.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'contracts-src', 'understand.contract.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'contracts', 'understand.contract.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'artifacts', 'README.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'README.md'));
  await assertMissing(repoRoot, 'AGENTS.md');
  await assertMissing(repoRoot, 'CLAUDE.md');
  await assertMissing(repoRoot, '.github/copilot-instructions.md');
  await assertMissing(repoRoot, '.opencode/AGENTS.md');
});

test('status becomes the primary user-facing summary after init', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Canonical files: healthy/);
  assert.match(result.stdout, /Contracts: 6 compiled, synchronized/);
  assert.match(result.stdout, /Version\/schema: current/);
  assert.match(result.stdout, /Primary agent runtime: none/);
  assert.match(result.stdout, /Execution state: not bootstrapped/);
  assert.match(result.stdout, /Manual bootstrap: ready/);
  assert.match(result.stdout, /Bootstrap prompt: Read \.prodify\/AGENTS\.md/);
  assert.match(result.stdout, /Recommended next action: tell your agent:/);
});

test('doctor validates healthy setup after init', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['doctor']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /canonical: PASS/);
  assert.match(result.stdout, /contracts\/source: PASS/);
  assert.match(result.stdout, /contracts\/compiled: PASS/);
  assert.match(result.stdout, /canonical\/schema: PASS/);
  assert.match(result.stdout, /runtime\/state: PASS/);
  assert.match(result.stdout, /gitignore\/prodify: PASS/);
  assert.match(result.stdout, /bootstrap\/guidance: PASS/);
  assert.doesNotMatch(result.stdout, /compatibility\//);
});

test('update is a no-op refresh on a current repo', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['update']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Prodify Update/);
  assert.match(result.stdout, /Version\/schema: current/);
  assert.match(result.stdout, /Canonical assets: /);
  assert.match(result.stdout, /Compiled contracts: 6/);
  assert.match(result.stdout, /Legacy compatibility adapters: not part of the default flow/);
});

test('update repairs outdated version metadata and restores .prodify runtime assets only', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  await fs.writeFile(path.join(repoRoot, '.prodify', 'version.json'), '{\n  "schema_version": "1",\n  "preset_name": "default",\n  "preset_version": "1.0.0"\n}\n', 'utf8');
  await fs.rm(path.join(repoRoot, '.prodify', 'runtime-commands.md'));

  const result = await execCli(repoRoot, ['update']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Version\/schema: outdated/);
  await fs.access(path.join(repoRoot, '.prodify', 'runtime-commands.md'));
  await assertMissing(repoRoot, 'AGENTS.md');
});

test('update preserves user-owned canonical files', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  await fs.writeFile(path.join(repoRoot, '.prodify', 'AGENTS.md'), '# Canonical\n\nCustom operator guidance.\n', 'utf8');
  await fs.writeFile(path.join(repoRoot, '.prodify', 'project.md'), '# Project\n\nCustom project context.\n', 'utf8');

  const result = await execCli(repoRoot, ['update']);

  assert.equal(result.exitCode, 0);
  assert.match(await readRepoFile(repoRoot, '.prodify/AGENTS.md'), /Custom operator guidance/);
  assert.match(await readRepoFile(repoRoot, '.prodify/project.md'), /Custom project context/);
  await assertMissing(repoRoot, 'AGENTS.md');
});

test('source-only contract edits are detected until compiled contracts are refreshed', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  await fs.appendFile(path.join(repoRoot, '.prodify', 'contracts-src', 'understand.contract.md'), '\nAdditional editing note.\n', 'utf8');

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Contracts: stale: understand/);
  assert.match(result.stdout, /Recommended next action: prodify update/);
});

test('status reports malformed runtime state and recommends update', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await fs.writeFile(path.join(repoRoot, '.prodify', 'state.json'), '{bad json\n', 'utf8');

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Runtime state: Runtime state is malformed/);
  assert.match(result.stdout, /Recommended next action: prodify update/);
});

test('doctor fails clearly when .gitignore hides .prodify', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await fs.writeFile(path.join(repoRoot, '.gitignore'), '.prodify/\n', 'utf8');

  const result = await execCli(repoRoot, ['doctor']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /gitignore\/prodify: FAIL/);
});

test('runtime bootstrap and resume readiness are reflected in status', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const initial = await readRuntimeState(repoRoot, {
    presetMetadata: {
      name: 'default',
      version: '4.0.0',
      schemaVersion: '4'
    }
  });
  const bootstrapped = bootstrapFlowState(initial, {
    agent: 'codex',
    mode: 'interactive'
  });
  const running = startFlowExecution(bootstrapped);
  await writeRuntimeState(repoRoot, running);

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Primary agent runtime: codex/);
  assert.match(result.stdout, /Execution state: understand_pending at understand \(01-understand\)/);
  assert.match(result.stdout, /Resumable: yes/);
  assert.match(result.stdout, /Recommended next action: \$prodify-resume/);
});

test('status can render a deterministic bootstrap prompt for a requested profile', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status', '--agent', 'claude']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Bootstrap profile: claude/);
  assert.match(result.stdout, /Bootstrap prompt: Read \.prodify\/AGENTS\.md/);
});

test('canonical runtime instructions live inside .prodify guidance', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const guidance = await readRepoFile(repoRoot, '.prodify/AGENTS.md');
  const runtimeCommands = await readRepoFile(repoRoot, '.prodify/runtime-commands.md');

  assert.match(guidance, /Read \.prodify\/AGENTS\.md and bootstrap Prodify/);
  assert.match(guidance, /\.prodify\/contracts-src\//);
  assert.match(guidance, /\$prodify-init/);
  assert.match(runtimeCommands, /\$prodify-execute/);
  assert.match(runtimeCommands, /compiled-contract validation/i);
  assert.match(runtimeCommands, /\$prodify-resume/);
});

test('legacy install remains explicit compatibility support', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['install', '--agent', 'codex']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stderr, /Deprecated command: prodify install/);
  assert.match(result.stdout, /legacy compatibility install codex/);
  assert.match(await readRepoFile(repoRoot, 'AGENTS.md'), /Generated by Prodify\./);
});

test('README and help output match the lifecycle model', async () => {
  const repoRoot = await createTempRepo();
  const readme = await fs.readFile(path.join(process.cwd(), 'README.md'), 'utf8');
  const help = await execCli(repoRoot, ['--help']);

  assert.match(readme, /prodify status/);
  assert.match(readme, /read `\.prodify\/AGENTS\.md`/i);
  assert.match(readme, /No root-level agent files are required/i);
  assert.doesNotMatch(readme, /prodify install --agent/);
  assert.match(help.stdout, /prodify status/);
  assert.match(help.stdout, /prodify update/);
  assert.doesNotMatch(help.stdout, /prodify install/);
});
