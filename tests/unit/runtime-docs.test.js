import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function read(relativePath) {
  return fs.readFile(path.join(process.cwd(), relativePath), 'utf8');
}

test('runtime docs agree on bootstrap, contracts, scoring, and non-authoritative task overlays', async () => {
  const [readme, contributorGuidance, runtimeGuidance] = await Promise.all([
    read('README.md'),
    read('AGENTS.md'),
    read('.prodify/AGENTS.md')
  ]);

  assert.match(readme, /\$prodify-init/);
  assert.match(readme, /Scoring is required in the normal workflow/i);
  assert.match(readme, /Contracts remain the execution input/i);
  assert.match(readme, /validators plus scoring remain the execution gates/i);
  assert.match(readme, /Optional extension surfaces such as `\.prodify\/tasks\/`, `\.prodify\/rules\/`, and `\.prodify\/templates\/`/);

  assert.match(contributorGuidance, /repository-local contributor guidance only/i);
  assert.match(contributorGuidance, /not the canonical runtime bootstrap or execution interface/i);
  assert.match(contributorGuidance, /old task\/template execution model/i);

  assert.match(runtimeGuidance, /\.prodify\/runtime\/bootstrap\.json/);
  assert.match(runtimeGuidance, /Contracts, runtime manifests\/context, validators, and scoring remain authoritative/i);
  assert.match(runtimeGuidance, /They are not primary runtime control inputs/i);
  assert.doesNotMatch(runtimeGuidance, /^- `\.prodify\/tasks\/`$/m);
});

test('self-hosting docs distinguish this repository workspace from fresh init output', async () => {
  const [readme, workspaceReadme, layoutDoc] = await Promise.all([
    read('README.md'),
    read('.prodify/README.md'),
    read('docs/canonical-prodify-layout.md')
  ]);

  assert.match(readme, /Fresh `prodify init` repo/);
  assert.match(readme, /self-hosting development workspace/i);
  assert.match(readme, /not a byte-for-byte template/i);
  assert.match(workspaceReadme, /self-hosting workspace/i);
  assert.match(workspaceReadme, /not a byte-for-byte snapshot/i);
  assert.match(layoutDoc, /Fresh Init vs Self-Hosted Workspace/);
  assert.match(layoutDoc, /Self-hosting development workspace, not a byte-for-byte fresh-init snapshot/i);
});
