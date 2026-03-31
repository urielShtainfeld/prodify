import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileEntry } from '../types.js';

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function writeFileEnsuringDir(targetPath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, 'utf8');
}

export async function copyTree(sourceDir: string, destinationDir: string): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  await ensureDir(destinationDir);

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      await copyTree(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await writeFileEnsuringDir(destinationPath, await fs.readFile(sourcePath, 'utf8'));
    }
  }
}

export async function listFilesRecursive(rootDir: string, prefix = ''): Promise<FileEntry[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: FileEntry[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const nextPrefix = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath, nextPrefix)));
    } else if (entry.isFile()) {
      files.push({
        fullPath,
        relativePath: nextPrefix
      });
    }
  }

  return files;
}
