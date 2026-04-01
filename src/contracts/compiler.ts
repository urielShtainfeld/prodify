import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { listFilesRecursive, pathExists, writeFileEnsuringDir } from '../core/fs.js';
import { normalizeRepoRelativePath, resolveCanonicalPath } from '../core/paths.js';
import { ProdifyError } from '../core/errors.js';
import { parseContractSource } from './parser.js';
import { buildCompiledContract, validateCompiledContractShape } from './schema.js';
import type { CompiledContractInventory, CompiledStageContract, FlowStage } from '../types.js';

const STAGES: readonly FlowStage[] = ['understand', 'diagnose', 'architecture', 'plan', 'refactor', 'validate'];

function createSourceHash(source: string): string {
  return crypto.createHash('sha256').update(source).digest('hex');
}

export function serializeCompiledContract(contract: CompiledStageContract): string {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

export function compileContractSource(options: {
  markdown: string;
  sourcePath: string;
}): CompiledStageContract {
  const { markdown, sourcePath } = options;
  const document = parseContractSource(markdown);
  return buildCompiledContract({
    document,
    sourcePath,
    sourceHash: createSourceHash(markdown.replace(/\r\n/g, '\n'))
  });
}

export async function compileContractsFromSourceDir(repoRoot: string): Promise<CompiledStageContract[]> {
  const sourceDir = resolveCanonicalPath(repoRoot, '.prodify/contracts-src');
  if (!(await pathExists(sourceDir))) {
    throw new ProdifyError('Contract source directory is missing: .prodify/contracts-src', {
      code: 'CONTRACT_SOURCE_MISSING'
    });
  }

  const files = (await listFilesRecursive(sourceDir))
    .filter((file) => file.relativePath.endsWith('.contract.md'))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const contracts = [];
  for (const file of files) {
    const sourcePath = `.prodify/contracts-src/${normalizeRepoRelativePath(file.relativePath)}`;
    contracts.push(compileContractSource({
      markdown: await fs.readFile(file.fullPath, 'utf8'),
      sourcePath
    }));
  }

  const seenStages = new Set<FlowStage>();
  for (const contract of contracts) {
    if (seenStages.has(contract.stage)) {
      throw new ProdifyError(`Duplicate contract stage detected: ${contract.stage}.`, {
        code: 'CONTRACT_SCHEMA_INVALID'
      });
    }

    seenStages.add(contract.stage);
  }

  return contracts.sort((left, right) => left.stage.localeCompare(right.stage));
}

export async function synchronizeRuntimeContracts(repoRoot: string): Promise<CompiledStageContract[]> {
  const contracts = await compileContractsFromSourceDir(repoRoot);
  const compiledDir = resolveCanonicalPath(repoRoot, '.prodify/contracts');

  await writeFileEnsuringDir(
    resolveCanonicalPath(repoRoot, '.prodify/contracts/README.md'),
    '# Compiled Contracts\n\nThis directory contains deterministic runtime-only JSON contracts generated from `.prodify/contracts-src/`.\n'
  );

  for (const contract of contracts) {
    await writeFileEnsuringDir(
      resolveCanonicalPath(repoRoot, `.prodify/contracts/${contract.stage}.contract.json`),
      serializeCompiledContract(contract)
    );
  }

  const existingFiles = (await pathExists(compiledDir))
    ? await listFilesRecursive(compiledDir)
    : [];
  for (const file of existingFiles) {
    if (!file.relativePath.endsWith('.contract.json')) {
      continue;
    }

    const stage = file.relativePath.replace(/\.contract\.json$/, '') as FlowStage;
    if (!STAGES.includes(stage)) {
      await fs.rm(file.fullPath, { force: true });
    }
  }

  return contracts;
}

export async function loadCompiledContract(repoRoot: string, stage: FlowStage): Promise<CompiledStageContract> {
  const contractPath = resolveCanonicalPath(repoRoot, `.prodify/contracts/${stage}.contract.json`);
  if (!(await pathExists(contractPath))) {
    throw new ProdifyError(`Compiled contract is missing for stage "${stage}".`, {
      code: 'COMPILED_CONTRACT_MISSING'
    });
  }

  const parsed = JSON.parse(await fs.readFile(contractPath, 'utf8'));
  return validateCompiledContractShape(parsed);
}

export async function inspectCompiledContracts(repoRoot: string): Promise<CompiledContractInventory> {
  const inventory: CompiledContractInventory = {
    ok: true,
    sourceCount: 0,
    compiledCount: 0,
    staleStages: [],
    missingCompiledStages: [],
    missingSourceStages: [],
    invalidStages: []
  };

  let expectedContracts: CompiledStageContract[] = [];
  try {
    expectedContracts = await compileContractsFromSourceDir(repoRoot);
    inventory.sourceCount = expectedContracts.length;
  } catch (error) {
    inventory.ok = false;
    inventory.invalidStages.push(error instanceof Error ? error.message : String(error));
  }

  const expectedByStage = new Map<FlowStage, CompiledStageContract>();
  for (const contract of expectedContracts) {
    expectedByStage.set(contract.stage, contract);
  }

  for (const stage of STAGES) {
    const expected = expectedByStage.get(stage);
    if (!expected) {
      inventory.ok = false;
      inventory.missingSourceStages.push(stage);
      continue;
    }

    try {
      const compiled = await loadCompiledContract(repoRoot, stage);
      inventory.compiledCount += 1;
      if (serializeCompiledContract(compiled) !== serializeCompiledContract(expected)) {
        inventory.ok = false;
        inventory.staleStages.push(stage);
      }
    } catch (error) {
      inventory.ok = false;
      inventory.missingCompiledStages.push(stage);
      inventory.invalidStages.push(error instanceof Error ? error.message : String(error));
    }
  }

  inventory.staleStages.sort((left, right) => left.localeCompare(right));
  inventory.missingCompiledStages.sort((left, right) => left.localeCompare(right));
  inventory.missingSourceStages.sort((left, right) => left.localeCompare(right));
  inventory.invalidStages.sort((left, right) => left.localeCompare(right));

  return inventory;
}
