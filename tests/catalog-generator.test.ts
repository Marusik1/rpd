import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scanDocuments, serializeCatalog } from '../scripts/lib/scan-documents.js';

const roots: string[] = [];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'rpd-catalog-'));
  roots.push(root);
  return root;
}

async function add(root: string, relativePath: string): Promise<void> {
  const filename = path.join(root, ...relativePath.split('/'));
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, '%PDF-1.4 fixture');
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('scanDocuments', () => {
  it('derives structural fields and parsed metadata from valid PDF paths', async () => {
    const root = await fixtureRoot();
    await add(root, 'documents/bachelor/2/Б1.О.01 Гражданское право (РПД).PDF');
    await add(root, 'documents/master/corporate-law/1/МДК.01.02 Договорное право.pdf');
    await add(root, 'documents/master/business-legal-support/2/Практикум.pdf');
    await add(root, 'documents/bachelor/2/notes.txt');

    const result = await scanDocuments(root);

    expect(result.warnings).toEqual([]);
    expect(result.documents).toEqual([
      expect.objectContaining({
        level: 'bachelor',
        program: null,
        course: 2,
        code: 'Б1.О.01',
        name: 'Гражданское право',
        filename: 'Б1.О.01 Гражданское право (РПД).PDF',
        path: 'documents/bachelor/2/Б1.О.01 Гражданское право (РПД).PDF',
      }),
      expect.objectContaining({
        level: 'master',
        program: 'corporate-law',
        course: 1,
        code: 'МДК.01.02',
        name: 'Договорное право',
      }),
      expect.objectContaining({
        level: 'master',
        program: 'business-legal-support',
        course: 2,
        code: null,
        name: 'Практикум',
      }),
    ]);
    expect(result.documents.every(({ id }) => /^[A-Za-z0-9_-]+$/u.test(id))).toBe(true);
  });

  it('sorts records deterministically and emits POSIX relative paths', async () => {
    const root = await fixtureRoot();
    await add(root, 'documents/bachelor/1/Б1.О.10 Поздняя.pdf');
    await add(root, 'documents/bachelor/1/Б1.О.2 Ранняя.pdf');

    const first = await scanDocuments(root);
    const second = await scanDocuments(root);

    expect(first).toEqual(second);
    expect(first.documents.map(({ code }) => code)).toEqual(['Б1.О.2', 'Б1.О.10']);
    expect(first.documents.map(({ path: relative }) => relative)).toEqual([
      'documents/bachelor/1/Б1.О.2 Ранняя.pdf',
      'documents/bachelor/1/Б1.О.10 Поздняя.pdf',
    ]);
  });

  it.each([
    'documents/bachelor/6/Invalid.pdf',
    'documents/bachelor/1/nested/Surprise.pdf',
    'documents/master/unknown/1/Invalid.pdf',
    'documents/master/corporate-law/3/Invalid.pdf',
    'documents/other/1/Invalid.pdf',
  ])('rejects a PDF with invalid structure: %s', async (relativePath) => {
    const root = await fixtureRoot();
    await add(root, relativePath);

    await expect(scanDocuments(root)).rejects.toThrow(/invalid PDF structure/u);
  });

  it('warns about normalized duplicates in one course while retaining every file', async () => {
    const root = await fixtureRoot();
    await add(root, 'documents/bachelor/1/Б1.О.1 Теория права.pdf');
    await add(root, 'documents/bachelor/1/б1.о.1  теория   права (РПД).pdf');

    const result = await scanDocuments(root);

    expect(result.documents).toHaveLength(2);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'possible-duplicate',
        paths: expect.arrayContaining([
          'documents/bachelor/1/Б1.О.1 Теория права.pdf',
          'documents/bachelor/1/б1.о.1  теория   права (РПД).pdf',
        ]),
      }),
    ]);
  });

  it('fails when normalized filenames produce an exact document ID collision', async () => {
    const root = await fixtureRoot();
    await add(root, 'documents/bachelor/1/Café.pdf');
    await add(root, 'documents/bachelor/1/Cafe\u0301.pdf');

    await expect(scanDocuments(root)).rejects.toThrow(/document ID collision/u);
  });
});

describe('serializeCatalog', () => {
  it('produces stable versioned JSON ending in one newline', async () => {
    const root = await fixtureRoot();
    await add(root, 'documents/bachelor/1/Б1.О.2 Ранняя.pdf');
    const result = await scanDocuments(root);

    const output = serializeCatalog(result.documents);

    expect(output).toBe(serializeCatalog(result.documents));
    expect(output.endsWith('\n')).toBe(true);
    expect(output.endsWith('\n\n')).toBe(false);
    expect(JSON.parse(output)).toEqual({ version: 1, documents: result.documents });
  });

  it('serializes a valid empty catalog', () => {
    expect(serializeCatalog([])).toBe('{\n  "version": 1,\n  "documents": []\n}\n');
  });
});
