import { expect, test } from '@playwright/test';

test('keeps failures in shell and retries catalog loading', async ({ page }) => {
  let attempts = 0;
  await page.route('**/catalog.json', (route) => attempts++ === 0 ? route.fulfill({ status: 503 }) : route.fulfill({ json: { version: 1, documents: [] } }));
  await page.goto('/#/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByText('Не удалось загрузить каталог')).toBeVisible();
  await page.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.getByRole('link', { name: 'Бакалавриат' })).toBeVisible();
});
