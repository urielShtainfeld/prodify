import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCli } from '../../dist/cli.js';
import { inspectRepositoryStatus } from '../../dist/core/status.js';
import { resolveStageSkills } from '../../dist/core/skill-resolution.js';
import { loadSkillRegistry } from '../../dist/skills/loader.js';
import { validateSkillDefinitionShape } from '../../dist/skills/schema.js';
import { createTempRepo, memoryStream } from './helpers.js';

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

async function seedTypeScriptCliRepo(repoRoot) {
  await fs.mkdir(path.join(repoRoot, 'src'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'package.json'), JSON.stringify({
    name: 'fixture',
    version: '1.0.0',
    private: true
  }, null, 2));
  await fs.writeFile(path.join(repoRoot, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022'
    }
  }, null, 2));
  await fs.writeFile(path.join(repoRoot, 'src', 'cli.ts'), 'export const cli = true;\n');
}

test('valid skills load from the canonical registry', async () => {
  const repoRoot = await createTempRepo();
  const result = await execCli(repoRoot, ['init']);
  assert.equal(result.exitCode, 0);

  const registry = await loadSkillRegistry(repoRoot);

  assert.ok(registry.has('codebase-scanning'));
  assert.ok(registry.has('typescript-backend'));
  assert.ok(registry.has('test-hardening'));
});

test('invalid skills fail clearly', () => {
  assert.throws(
    () => validateSkillDefinitionShape({
      schema_version: '1',
      id: '',
      name: 'Broken Skill',
      version: '1.0.0',
      category: 'stage-method',
      description: 'broken',
      intended_use: ['broken'],
      stage_compatibility: ['understand'],
      activation_conditions: [],
      execution_guidance: ['broken'],
      caution_guidance: []
    }),
    /must be a non-empty string/
  );
});

test('stage-incompatible skills cannot be attached', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);

  const contractPath = path.join(repoRoot, '.prodify', 'contracts', 'plan.contract.json');
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  contract.skill_routing = {
    default_skills: ['validation-method'],
    allowed_skills: ['validation-method'],
    conditional_skills: []
  };
  await fs.writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');

  await assert.rejects(
    () => resolveStageSkills(repoRoot, 'plan'),
    /not compatible with stage "plan"/
  );
});

test('stage default and conditional skills resolve deterministically from repo context', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await seedTypeScriptCliRepo(repoRoot);

  const resolution = await resolveStageSkills(repoRoot, 'refactor');

  assert.equal(resolution.stage, 'refactor');
  assert.deepEqual(resolution.active_skill_ids, ['refactoring-method', 'test-hardening', 'typescript-backend']);
  assert.match(
    resolution.considered_skills.find((skill) => skill.id === 'typescript-backend').reason,
    /TypeScript/
  );
});

test('skill routing stays agent-agnostic across status views', async () => {
  const repoRoot = await createTempRepo();
  await execCli(repoRoot, ['init']);
  await seedTypeScriptCliRepo(repoRoot);

  const codexReport = await inspectRepositoryStatus(repoRoot, { agent: 'codex' });
  const claudeReport = await inspectRepositoryStatus(repoRoot, { agent: 'claude' });

  assert.deepEqual(codexReport.stageSkillResolution.active_skill_ids, claudeReport.stageSkillResolution.active_skill_ids);
  assert.equal(codexReport.stageSkillResolution.stage, 'understand');
});
