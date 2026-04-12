import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { bootstrapFlowState, failFlowStage, startFlowExecution } from '../../dist/core/flow-state.js';
import { readRuntimeState, writeRuntimeState } from '../../dist/core/state.js';
import { createTempDir, createTempRepo, memoryStream } from '../unit/helpers.js';

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
  assert.match(result.stdout, /Next action: prodify init/);
});

test('init creates only .prodify-owned runtime scaffolding', async () => {
  const repoRoot = await createTempRepo();

  const result = await execCli(repoRoot, ['init']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Initialized Prodify/);
  assert.match(result.stdout, /prodify setup-agent <agent>/);
  assert.match(result.stdout, /Default inside-agent bootstrap: open a configured agent in this repo and run `\$prodify-init`/);
  assert.match(result.stdout, /Compact runtime bootstrap was generated under `\.prodify\/runtime\/bootstrap\.json`/);
  assert.match(result.stdout, /Compiled runtime contracts were generated under \.prodify\/contracts\//);
  assert.match(result.stdout, /Gitignore: updated at \.gitignore/);
  await fs.access(path.join(repoRoot, '.prodify', 'state.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'bootstrap.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'current-stage.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'current-iteration.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'delta.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'validation-delta.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'hotspots.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'enforcement-loop.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'iteration-telemetry.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'repo-context.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime', 'skill-resolution', 'understand.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'runtime-commands.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'contracts-src', 'understand.contract.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'contracts', 'understand.contract.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'contracts', 'manifest.json'));
  await fs.access(path.join(repoRoot, '.prodify', 'artifacts', 'README.md'));
  await fs.access(path.join(repoRoot, '.prodify', 'metrics', 'README.md'));
  const gitignore = await readRepoFile(repoRoot, '.gitignore');
  assert.match(gitignore, /# BEGIN PRODIFY GENERATED/);
  assert.match(gitignore, /\.prodify\/runtime\//);
  assert.doesNotMatch(gitignore, /^\.prodify\/$/m);
  await assertMissing(repoRoot, 'AGENTS.md');
  await assertMissing(repoRoot, 'CLAUDE.md');
  await assertMissing(repoRoot, '.github/copilot-instructions.md');
  await assertMissing(repoRoot, '.opencode/AGENTS.md');
});

test('init prefers the current git repo over an unrelated ancestor .prodify workspace', async () => {
  const outerRepo = await createTempRepo('prodify-outer-');
  await execCli(outerRepo, ['init']);

  const nestedRepo = path.join(outerRepo, 'nested-app');
  await fs.mkdir(path.join(nestedRepo, '.git'), { recursive: true });

  const result = await execCli(nestedRepo, ['init']);

  assert.equal(result.exitCode, 0);
  await fs.access(path.join(nestedRepo, '.prodify', 'state.json'));
});

test('status becomes the primary user-facing summary after init', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status']);
  const verbose = await execCli(repoRoot, ['status', '--verbose']);

  assert.equal(result.exitCode, 0);
  assert.ok(result.stdout.length < verbose.stdout.length);
  assert.match(result.stdout, /Health: healthy/);
  assert.match(result.stdout, /Contracts: 6 compiled, synchronized/);
  assert.match(result.stdout, /State: not bootstrapped/);
  assert.match(result.stdout, /Scoring: baseline pending until `\$prodify-init` starts execution/);
  assert.match(result.stdout, /Bootstrap: codex ready/);
  assert.match(result.stdout, /Next action: prodify setup-agent <agent>/);

  assert.equal(verbose.exitCode, 0);
  assert.match(verbose.stdout, /Workspace health: healthy/);
  assert.match(verbose.stdout, /Canonical files: healthy/);
  assert.match(verbose.stdout, /Contract freshness: 6 compiled, synchronized/);
  assert.match(verbose.stdout, /Version\/schema: current/);
  assert.match(verbose.stdout, /Repo runtime binding: agent-agnostic/);
  assert.match(verbose.stdout, /Global agent setup: none configured/);
  assert.match(verbose.stdout, /Skill routing stage: understand/);
  assert.match(verbose.stdout, /Skills considered: codebase-scanning/);
  assert.match(verbose.stdout, /Skills active: codebase-scanning/);
  assert.match(verbose.stdout, /Execution state: not bootstrapped/);
  assert.match(verbose.stdout, /Stage validation: not run yet/);
  assert.match(verbose.stdout, /Scoring summary: baseline pending until `\$prodify-init` starts execution/);
  assert.match(verbose.stdout, /Bootstrap runtime: ready/);
  assert.match(verbose.stdout, /Bootstrap prompt: Open this repository in Codex and run `\$prodify-init`\./);
  assert.match(verbose.stdout, /Recommended next action: prodify setup-agent <agent>/);
});

test('status surfaces baseline, final, and delta by default when score artifacts are available', async () => {
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
  await writeRuntimeState(repoRoot, bootstrapped);

  const finalState = startFlowExecution(bootstrapped);
  finalState.runtime.current_state = 'validate_complete';
  finalState.runtime.current_stage = 'validate';
  finalState.runtime.current_task_id = '06-validate';
  finalState.runtime.last_validation = {
    stage: 'validate',
    contract_version: '1.0.0',
    passed: true,
    violated_rules: [],
    missing_artifacts: [],
    warnings: [],
    diagnostics: ['ok']
  };
  finalState.runtime.last_validation_result = 'pass';
  await writeRuntimeState(repoRoot, finalState);

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Scoring: baseline \d+(\.\d+)? -> final \d+(\.\d+)? \(delta /);
});

test('setup-agent configures a supported agent globally without repo-local writes', async () => {
  const cwd = await createTempDir();
  process.env.CODEX_HOME = path.join(cwd, '.codex-home');

  const result = await execCli(cwd, ['setup-agent', 'codex']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Prodify Agent Setup/);
  assert.match(result.stdout, /Agent: codex/);
  assert.match(result.stdout, /Installed runtime commands:/);
  assert.match(result.stdout, /Repo impact: none/);
  await fs.access(path.join(cwd, '.prodify-home', 'agent-setup.json'));
  await fs.access(path.join(cwd, '.codex-home', 'skills', 'prodify-init', 'SKILL.md'));
  await fs.access(path.join(cwd, '.codex-home', 'skills', 'prodify-execute', 'SKILL.md'));
  await fs.access(path.join(cwd, '.codex-home', 'skills', 'prodify-resume', 'SKILL.md'));
  await assertMissing(cwd, '.prodify');
});

test('multiple agents can be set up independently and status uses configured setup for bootstrap guidance', async () => {
  const repoRoot = await createTempRepo();

  await execCli(repoRoot, ['setup-agent', 'codex']);
  await execCli(repoRoot, ['setup-agent', 'claude']);
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status', '--verbose', '--agent', 'claude']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Global agent setup: claude, codex/);
  assert.match(result.stdout, /Skill routing stage: understand/);
  assert.match(result.stdout, /Bootstrap profile: claude/);
  assert.match(result.stdout, /tell your agent:/);
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
  assert.match(result.stdout, /scoring\/artifacts: PASS - baseline\/final\/delta are captured during normal execution after `\$prodify-init`/);
  assert.doesNotMatch(result.stdout, /compatibility\//);
});

test('status and doctor flag missing score artifacts after execution has started', async () => {
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
  await writeRuntimeState(repoRoot, bootstrapped);

  await fs.rm(path.join(repoRoot, '.prodify', 'metrics', 'baseline.score.json'));
  await fs.rm(path.join(repoRoot, '.prodify', 'metrics', 'baseline.json'));

  const status = await execCli(repoRoot, ['status']);
  const doctor = await execCli(repoRoot, ['doctor']);

  assert.equal(status.exitCode, 1);
  assert.match(status.stdout, /Scoring: missing baseline score artifact after execution started/);
  assert.equal(doctor.exitCode, 1);
  assert.match(doctor.stdout, /scoring\/artifacts: FAIL - missing baseline score artifact after execution started/);
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
  await assertMissing(repoRoot, 'CLAUDE.md');
  await assertMissing(repoRoot, '.github/copilot-instructions.md');
  await assertMissing(repoRoot, '.opencode/AGENTS.md');
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
  assert.match(result.stdout, /Next action: prodify update/);
});

test('status reports malformed runtime state and recommends update', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await fs.writeFile(path.join(repoRoot, '.prodify', 'state.json'), '{bad json\n', 'utf8');

  const result = await execCli(repoRoot, ['status']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Runtime state: Runtime state is malformed/);
  assert.match(result.stdout, /Next action: prodify update/);
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
  await execCli(repoRoot, ['setup-agent', 'codex']);
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

  const result = await execCli(repoRoot, ['status', '--verbose']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Workspace health: healthy/);
  assert.match(result.stdout, /Repo runtime binding: agent-agnostic/);
  assert.match(result.stdout, /Global agent setup: codex/);
  assert.match(result.stdout, /Skill routing stage: understand/);
  assert.match(result.stdout, /Skills active: codebase-scanning/);
  assert.match(result.stdout, /Execution state: understand_pending at understand \(01-understand\)/);
  assert.match(result.stdout, /Stage validation: not run yet/);
  assert.match(result.stdout, /Resumable: yes/);
  assert.match(result.stdout, /Recommended next action: \$prodify-resume/);
});

test('status distinguishes stage-validation failure from workspace health issues', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['setup-agent', 'codex']);
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
  await writeRuntimeState(repoRoot, bootstrapped);
  const running = startFlowExecution(bootstrapped);
  const failed = failFlowStage(running, {
    reason: 'Required artifact .prodify/artifacts/01-understand.md is missing.'
  });
  await writeRuntimeState(repoRoot, failed);

  const result = await execCli(repoRoot, ['status', '--verbose']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stdout, /Workspace health: healthy/);
  assert.match(result.stdout, /Stage validation: failed at understand:/);
  assert.match(result.stdout, /Recommended next action: rerun or remediate stage outputs/);
});

test('status can render a deterministic bootstrap prompt for a requested profile', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['setup-agent', 'claude']);
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status', '--verbose', '--agent', 'claude']);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Bootstrap profile: claude/);
  assert.match(result.stdout, /Bootstrap prompt: Open this repository in Claude and run `\$prodify-init`\./);
});

test('canonical runtime instructions live inside .prodify guidance', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const guidance = await readRepoFile(repoRoot, '.prodify/AGENTS.md');
  const runtimeCommands = await readRepoFile(repoRoot, '.prodify/runtime-commands.md');

  assert.match(guidance, /Run `\$prodify-init`\./);
  assert.match(guidance, /\.prodify\/runtime\/bootstrap\.json/);
  assert.match(guidance, /\$prodify-init/);
  assert.match(runtimeCommands, /\$prodify-execute/);
  assert.match(runtimeCommands, /prodify setup-agent/);
  assert.match(runtimeCommands, /\.prodify\/runtime\/bootstrap\.json/);
  assert.match(runtimeCommands, /compiled-contract validation/i);
  assert.match(runtimeCommands, /\$prodify-resume/);
});

test('status --json exposes compact machine-readable runtime data', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['setup-agent', 'codex']);
  await execCli(repoRoot, ['init']);

  const result = await execCli(repoRoot, ['status', '--json']);
  const parsed = JSON.parse(result.stdout);

  assert.equal(result.exitCode, 0);
  assert.equal(parsed.repository, 'initialized');
  assert.equal(parsed.workspace_health, 'healthy');
  assert.equal(parsed.contract_freshness, '6 compiled, synchronized');
  assert.deepEqual(parsed.global_agent_setup, ['codex']);
  assert.equal(parsed.bootstrap.profile, 'codex');
  assert.equal(parsed.bootstrap.ready, true);
  assert.match(parsed.bootstrap.prompt, /\$prodify-init/);
  assert.equal(parsed.recommended_next_action, 'tell your agent: "Open this repository in Codex and run `$prodify-init`."');
});

test('no command path can create root-level legacy adapter files', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await execCli(repoRoot, ['update']);

  await assertMissing(repoRoot, 'AGENTS.md');
  await assertMissing(repoRoot, 'CLAUDE.md');
  await assertMissing(repoRoot, '.github/copilot-instructions.md');
  await assertMissing(repoRoot, '.opencode/AGENTS.md');
});

test('removed legacy commands are not available anymore', async () => {
  const repoRoot = await createTempRepo();
  const result = await execCli(repoRoot, ['install', '--agent', 'codex']);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown command: install/);
});

test('README and help output match the lifecycle model', async () => {
  const repoRoot = await createTempRepo();
  const readme = await fs.readFile(path.join(process.cwd(), 'README.md'), 'utf8');
  const compatibilityTargets = await fs.readFile(path.join(process.cwd(), 'docs', 'compatibility-targets.md'), 'utf8');
  const codexSupport = await fs.readFile(path.join(process.cwd(), 'docs', 'codex-support.md'), 'utf8');
  const help = await execCli(repoRoot, ['--help']);

  assert.match(readme, /prodify setup-agent codex/);
  assert.match(readme, /prodify status/);
  assert.match(readme, /`\.prodify\/runtime\/bootstrap\.json`/);
  assert.match(readme, /`\.prodify\/AGENTS\.md` is a compact human pointer/i);
  assert.match(readme, /`\.prodify\/skills\/`/);
  assert.match(readme, /No root-level agent files are required/i);
  assert.match(readme, /Repo initialization stays agent-agnostic/i);
  assert.match(readme, /root `AGENTS\.md`.*repository-local contributor guidance/i);
  assert.match(readme, /Scoring is required in the normal workflow/i);
  assert.match(readme, /Optional extension surfaces such as `\.prodify\/tasks\/`, `\.prodify\/rules\/`, and `\.prodify\/templates\/`/);
  assert.match(readme, /Fresh `prodify init` repo/);
  assert.doesNotMatch(readme, /Tasks live under `?\.prodify\/tasks\/`?/i);
  assert.doesNotMatch(readme, /prodify install --agent/);
  assert.match(compatibilityTargets, /do not create root-level compatibility files/i);
  assert.match(codexSupport, /not part of the default lifecycle/i);
  assert.match(help.stdout, /prodify setup-agent/);
  assert.match(help.stdout, /prodify status/);
  assert.match(help.stdout, /prodify update/);
  assert.doesNotMatch(help.stdout, /prodify install/);
});
