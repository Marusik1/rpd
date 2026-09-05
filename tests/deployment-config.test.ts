import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';

test('Pages workflow runs the complete ordered production chain', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/deploy-pages.yml', import.meta.url),
    'utf8',
  );
  const ordered = [
    'run: npm ci',
    'run: npm run generate:catalog',
    'run: npm run lint',
    'run: npm run typecheck',
    'run: npm test',
    'run: npm run build',
    'uses: actions/upload-pages-artifact@v3',
    'uses: actions/deploy-pages@v4',
  ];
  let cursor = -1;
  for (const command of ordered) {
    const next = workflow.indexOf(command, cursor + 1);
    assert.ok(next > cursor, `${command} is missing or out of order`);
    cursor = next;
  }

  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /concurrency:[\s\S]*group:\s*pages/);
  assert.match(workflow, /path:\s*apps\/web\/dist\//);
  assert.match(workflow, /VITE_WORKER_URL:\s*\$\{\{\s*vars\.VITE_WORKER_URL/);
  assert.match(workflow, /https:\/\/[^\s'"]+\.workers\.dev/);
  assert.match(workflow, /VITE_BASE_PATH:[^\n]*github\.event\.repository\.name/);
  assert.doesNotMatch(workflow, /secrets\.(?:BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET)/);
});

test('deployment manifests contain public placeholders but no secret values', async () => {
  const [example, wrangler, rootManifest, viteConfig] = await Promise.all([
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../apps/worker/wrangler.toml', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../apps/web/vite.config.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(example, /VITE_WORKER_URL=https:\/\//);
  assert.match(wrangler, /DEV_MINI_APP_ORIGIN = "http:\/\/localhost:5173"/);
  assert.doesNotMatch(`${example}\n${wrangler}`, /Access-Control-Allow-Origin:\s*\*/);
  assert.doesNotMatch(`${example}\n${wrangler}`, /(?:BOT_TOKEN|TELEGRAM_WEBHOOK_SECRET)\s*=/);
  assert.match(rootManifest, /"deploy:worker"/);
  assert.match(viteConfig, /GITHUB_REPOSITORY/);
  assert.match(viteConfig, /outDir:\s*'dist'/);
});
