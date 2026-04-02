import { compileContractsFromSourceDir, loadCompiledContract, serializeCompiledContract } from './compiler.js';
import { CONTRACT_STAGE_NAMES } from './source-schema.js';
export async function inspectCompiledContracts(repoRoot) {
    const inventory = {
        ok: true,
        sourceCount: 0,
        compiledCount: 0,
        staleStages: [],
        missingCompiledStages: [],
        missingSourceStages: [],
        invalidStages: []
    };
    let expectedContracts = [];
    try {
        expectedContracts = await compileContractsFromSourceDir(repoRoot);
        inventory.sourceCount = expectedContracts.length;
    }
    catch (error) {
        inventory.ok = false;
        inventory.invalidStages.push(error instanceof Error ? error.message : String(error));
    }
    const expectedByStage = new Map();
    for (const contract of expectedContracts) {
        expectedByStage.set(contract.stage, contract);
    }
    for (const stage of CONTRACT_STAGE_NAMES) {
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
        }
        catch (error) {
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
