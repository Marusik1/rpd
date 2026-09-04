import { expect, test } from '@playwright/test';
import { documentFixture, routeCatalog } from './fixture.js';

const secondDocument = { ...documentFixture, id: 'criminal-law-1', code: 'БС.2', name: 'Уголовное право', filename: 'Уголовное право.pdf', path: 'documents/bachelor/1/Уголовное право.pdf' };

test('global and course search match locally by normalized name and code and recover from no results', async ({ page }) => {
  await routeCatalog(page, [documentFixture, secondDocument]);
  const catalogRequests: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('catalog.json')) catalogRequests.push(request.url()); });
  await page.goto('/#/');
  const search = page.getByRole('searchbox', { name: 'Поиск по дисциплине или коду' });
  await search.fill('  гражданское  ');
  await expect(page.getByRole('link', { name: documentFixture.name })).toBeVisible();
  await expect(page.getByRole('link', { name: secondDocument.name })).toBeHidden();
  await search.fill('нет такой дисциплины');
  await expect(page.getByText('Ничего не найдено')).toBeVisible();
  await page.getByRole('button', { name: 'Очистить' }).click();
  await expect(page.getByRole('link', { name: 'Бакалавриат' })).toBeVisible();
  await page.goto('/#/bachelor/1');
  await page.getByRole('searchbox', { name: 'Поиск по дисциплине или коду' }).fill('бс.2');
  await expect(page.getByRole('link', { name: secondDocument.name })).toBeVisible();
  await expect(page.getByRole('link', { name: documentFixture.name })).toBeHidden();
  expect(catalogRequests).toHaveLength(1);
});

test('favorites survive reload and stale or corrupt preferences fail safely', async ({ page }) => {
  await routeCatalog(page, [documentFixture]);
  await page.goto(`/#/document/${documentFixture.id}`);
  await page.getByRole('button', { name: 'Добавить в избранное' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Удалить из избранного' })).toBeVisible();
  await page.goto('/#/favorites');
  await expect(page.getByRole('link', { name: documentFixture.name })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('rpd:document-preferences', '{broken'));
  await page.reload();
  await expect(page.getByText('Пока пусто')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('rpd:document-preferences', JSON.stringify({ version: 1, favoriteIds: ['stale'], recent: [{ id: 'stale', openedAt: 1 }] })));
  await page.reload();
  await expect(page.getByText('Пока пусто')).toBeVisible();
});

test('recent documents render newest first and are capped at five', async ({ page }) => {
  const documents = Array.from({ length: 6 }, (_, index) => ({ ...documentFixture, id: `document-${index}`, code: `БС.${index}`, name: `Дисциплина ${index}`, filename: `Дисциплина ${index}.pdf`, path: `documents/bachelor/1/Дисциплина ${index}.pdf` }));
  await routeCatalog(page, documents);
  await page.goto('/#/');
  await page.evaluate((ids) => localStorage.setItem('rpd:document-preferences', JSON.stringify({ version: 1, favoriteIds: [], recent: ids.map((id, index) => ({ id, openedAt: index })) })), documents.map(({ id }) => id));
  await page.reload();
  const recent = page.getByRole('heading', { name: 'Недавно открытые' }).locator('..').getByRole('listitem');
  await expect(recent).toHaveCount(5);
  await expect(recent.first()).toContainText('Дисциплина 5');
  await expect(recent.last()).toContainText('Дисциплина 1');
});
