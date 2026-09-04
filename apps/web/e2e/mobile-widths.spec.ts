import { expect, test } from '@playwright/test';
import { routeCatalog } from './fixture.js';

for (const width of [320, 375, 390, 430]) {
  test(`mobile-only shell has no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await routeCatalog(page);
    await page.goto('/#/bachelor/1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const shell = page.locator('.app-shell');
    await expect(shell).toBeVisible();
    expect((await shell.boundingBox())?.width).toBeLessThanOrEqual(430);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toHaveCount(0);

    await page.goto('/#/');
    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();
  });
}

test('mobile shell stays capped at 430px on a wide viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 844 });
  await routeCatalog(page);
  await page.goto('/#/');
  expect((await page.locator('.app-shell').boundingBox())?.width).toBe(430);
});
