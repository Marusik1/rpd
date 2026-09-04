import { expect, test } from '@playwright/test';
import { routeCatalog } from './fixture.js';

for (const width of [320, 375, 390, 430]) test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 700 });
  await routeCatalog(page);
  await page.goto('/#/bachelor/1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.getByRole('main')).toBeVisible();
});
