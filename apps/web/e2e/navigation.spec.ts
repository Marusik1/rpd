import { expect, test } from '@playwright/test';
import { documentFixture, routeCatalog } from './fixture.js';

test('navigates hash routes from one catalog request', async ({ page }) => {
  await routeCatalog(page);
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('catalog.json')) requests.push(request.url()); });
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Бакалавриат' }).click();
  await page.getByRole('link', { name: '1 курс' }).click();
  await page.getByRole('link', { name: /Гражданское право/ }).click();
  await expect(page).toHaveURL(new RegExp(`#/document/${documentFixture.id}$`));
  await expect(page.getByRole('heading', { name: 'Гражданское право' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toHaveCount(0);
  await page.getByRole('link', { name: /РПД мини-приложение/ }).click();
  await expect(page.getByRole('heading', { name: 'Недавно открывали' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Гражданское право' })).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('renders direct hash routes and useful stale routes in the shell', async ({ page }) => {
  await routeCatalog(page, []);
  await page.goto('/#/bachelor/3');
  await expect(page.getByText('Пока нет загруженных РПД для этого курса')).toBeVisible();
  await page.goto('/#/document/stale');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByText('Документ не найден')).toBeVisible();
  await page.goto('/#/unknown');
  await expect(page.getByText('Страница не найдена')).toBeVisible();
});
