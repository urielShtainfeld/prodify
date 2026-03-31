import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createTempRepo(prefix = 'prodify-test-') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(root, '.git'));
  return root;
}

export function memoryStream() {
  let value = '';
  return {
    write(chunk) {
      value += String(chunk);
    },
    toString() {
      return value;
    }
  };
}
