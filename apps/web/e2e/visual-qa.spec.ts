import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { routeCatalog } from './fixture.js';

const bachelorNames = [
  ['Б1.О.01', 'Философия'],
  ['Б1.О.02', 'История России'],
  ['Б1.О.03', 'Основы российской государственности'],
  ['Б1.О.09', 'Теория государства и права'],
  ['Б1.О.10', 'Конституционное право'],
  ['Б1.О.11', 'Административное право'],
] as const;

const courseDocuments = bachelorNames.map(([code, name], index) => ({
  id: `bachelor-1-document-${index + 1}`,
  level: 'bachelor',
  program: null,
  course: 1,
  code,
  name,
  filename: `${code} ${name} (РПД).pdf`,
  path: `documents/bachelor/1/${code} ${name} (РПД).pdf`,
}));

const detailDocument = {
  id: 'bachelor-3-civil-procedure',
  level: 'bachelor',
  program: null,
  course: 3,
  code: 'Б1.О.13',
  name: 'Гражданский процесс',
  filename: 'Б1.О.13 Гражданский процесс (РПД).pdf',
  path: 'documents/bachelor/3/Б1.О.13 Гражданский процесс (РПД).pdf',
};

const criminalDocument = {
  ...detailDocument,
  id: 'bachelor-3-criminal-procedure',
  code: 'Б1.О.17',
  name: 'Уголовный процесс',
  filename: 'Б1.О.17 Уголовный процесс (РПД).pdf',
  path: 'documents/bachelor/3/Б1.О.17 Уголовный процесс (РПД).pdf',
};

const visualCatalog = [...courseDocuments, detailDocument, criminalDocument];
const outputDirectory = resolve('artifacts/visual-qa/390x844');

async function prepare(page: Page, route: string, recentIds: string[] = []): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeCatalog(page, visualCatalog);
  if (recentIds.length) {
    await page.addInitScript((ids) => {
      localStorage.setItem('rpd:document-preferences', JSON.stringify({
        version: 1,
        favoriteIds: [],
        recent: ids.map((id, index) => ({ id, openedAt: ids.length - index })),
      }));
    }, recentIds);
  }
  await page.goto(route);
  await expect(page.getByRole('banner')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function capture(page: Page, filename: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await page.screenshot({ path: resolve(outputDirectory, filename), animations: 'disabled' });
}

test('@visual 01 home', async ({ page }) => {
  await prepare(page, '/#/', [detailDocument.id, criminalDocument.id]);
  await capture(page, '01-home.png');
});

test('@visual 02 bachelor course selection', async ({ page }) => {
  await prepare(page, '/#/bachelor');
  await capture(page, '02-bachelor.png');
});

test('@visual 03 discipline list', async ({ page }) => {
  await prepare(page, '/#/bachelor/1');
  await capture(page, '03-course.png');
});

test('@visual 04 master programs', async ({ page }) => {
  await prepare(page, '/#/master');
  await capture(page, '04-master.png');
});

test('@visual 05 document detail', async ({ page }) => {
  await page.addInitScript(() => {
    window.Telegram = {
      WebApp: {
        initData: 'visual-qa-init-data',
        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
      },
    };
  });
  await page.route('https://worker.example.test/api/send-document', (route) => route.fulfill({ json: { ok: true } }));
  await prepare(page, `/#/document/${detailDocument.id}`);
  await page.getByRole('button', { name: 'Получить в Telegram' }).click();
  await expect(page.getByText('РПД отправлена в чат')).toBeVisible();
  await capture(page, '05-document.png');
});
