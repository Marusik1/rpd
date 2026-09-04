import type { Page } from '@playwright/test';

export const documentFixture = { id: 'civil-law-1', level: 'bachelor', program: null, course: 1, code: 'БС.1', name: 'Гражданское право', filename: 'Гражданское право.pdf', path: 'documents/bachelor/1/Гражданское право.pdf' };

export async function routeCatalog(page: Page, documents: unknown[] = [documentFixture]): Promise<void> {
  await page.route('**/catalog.json', (route) => route.fulfill({ json: { version: 1, documents } }));
}
