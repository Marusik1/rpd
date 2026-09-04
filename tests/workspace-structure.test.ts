import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';

const expectedWorkspaces = ['apps/web', 'apps/worker', 'packages/shared'];
const expectedScripts = [
  'generate:catalog',
  'lint',
  'typecheck',
  'test',
  'test:e2e',
  'test:visual',
  'build',
  'verify',
];

test('root manifest defines the exact workspace and quality command surface', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    workspaces?: string[];
    scripts?: Record<string, string>;
  };

  assert.deepEqual(manifest.workspaces, expectedWorkspaces);

  for (const script of expectedScripts) {
    const command = manifest.scripts?.[script];

    assert.equal(typeof command, 'string', `missing root script: ${script}`);
    assert.notEqual(command?.trim(), '', `empty root script: ${script}`);
  }
});
