import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createTempDir } from './helpers.js';
import {
  createInitialGlobalAgentSetupState,
  listConfiguredAgents,
  readGlobalAgentSetupState,
  resolveGlobalAgentSetupStatePath,
  setupAgentIntegration
} from '../../dist/core/agent-setup.js';
import { detectRuntimeAgentFromEnv, resolveRuntimeAgentBinding } from '../../dist/core/agent-runtime.js';

test('global agent setup registers multiple agents without repo-local state', async () => {
  const root = await createTempDir();
  const env = {
    ...process.env,
    PRODIFY_HOME: path.join(root, '.prodify-home'),
    CODEX_HOME: path.join(root, '.codex-home')
  };

  const codexResult = await setupAgentIntegration('codex', {
    now: '2026-04-04T00:00:00.000Z',
    env
  });
  await setupAgentIntegration('claude', {
    now: '2026-04-04T00:05:00.000Z',
    env
  });

  const state = await readGlobalAgentSetupState({
    env
  });

  assert.deepEqual(listConfiguredAgents(state), ['claude', 'codex']);
  assert.equal(codexResult.installedPaths.length, 3);
  await fs.access(resolveGlobalAgentSetupStatePath(env));
  assert.match(await fs.readFile(path.join(root, '.codex-home', 'skills', 'prodify-init', 'SKILL.md'), 'utf8'), /\$prodify-init/);
  assert.match(await fs.readFile(path.join(root, '.codex-home', 'skills', 'prodify-execute', 'SKILL.md'), 'utf8'), /\$prodify-execute/);
  assert.match(await fs.readFile(path.join(root, '.codex-home', 'skills', 'prodify-resume', 'SKILL.md'), 'utf8'), /\$prodify-resume/);
  await assert.rejects(fs.access(path.join(root, '.prodify')));
});

test('runtime agent binding resolves from explicit, env, and single configured agent inputs', async () => {
  const root = await createTempDir();
  const env = {
    ...process.env,
    PRODIFY_HOME: path.join(root, '.prodify-home')
  };

  await setupAgentIntegration('copilot', {
    now: '2026-04-04T00:10:00.000Z',
    env
  });

  assert.equal(await resolveRuntimeAgentBinding({
    requestedAgent: 'claude',
    env
  }), 'claude');
  assert.equal(detectRuntimeAgentFromEnv({
    ...env,
    PRODIFY_ACTIVE_AGENT: 'opencode'
  }), 'opencode');
  assert.equal(await resolveRuntimeAgentBinding({
    env
  }), 'copilot');
});

test('runtime agent binding rejects ambiguous or missing global setup', async () => {
  const root = await createTempDir();
  const env = {
    ...process.env,
    PRODIFY_HOME: path.join(root, '.prodify-home'),
    CODEX_HOME: path.join(root, '.codex-home')
  };

  assert.deepEqual(listConfiguredAgents(createInitialGlobalAgentSetupState()), []);

  await assert.rejects(resolveRuntimeAgentBinding({ env }), /setup-agent/);

  await setupAgentIntegration('codex', { env });
  await setupAgentIntegration('claude', { env });

  await assert.rejects(resolveRuntimeAgentBinding({ env }), /Multiple agents/);
});
