import { describe, expect, it } from 'vitest';

import type { CatalogDocument } from '../src/catalog.js';
import {
  compareCatalogDocuments,
  matchesDocumentSearch,
  normalizeSearchText,
  sortCatalogDocuments,
} from '../src/search.js';

const makeDocument = (code: string | null, name: string): CatalogDocument => ({
  id: `${code ?? 'none'}-${name}`,
  level: 'bachelor',
  program: null,
  course: 1,
  code,
  name,
  filename: `${name}.pdf`,
  path: `documents/bachelor/1/${name}.pdf`,
});

describe('normalizeSearchText', () => {
  it('normalizes Unicode, case, whitespace, and ё to е', () => {
    expect(normalizeSearchText('  ЁЛОЧНОЕ\t ПРАВО  ')).toBe('елочное право');
  });
});

describe('matchesDocumentSearch', () => {
  const document = makeDocument('Б1.О.07', 'Корпоративное право');

  it('matches normalized document names and discipline codes', () => {
    expect(matchesDocumentSearch(document, '  корпоративное   ПРАВО ')).toBe(true);
    expect(matchesDocumentSearch(document, 'б1.о.07')).toBe(true);
    expect(matchesDocumentSearch(document, 'уголовное')).toBe(false);
  });
});

describe('catalog sorting', () => {
  it('sorts codes by numeric components, then names, with code-less documents by name', () => {
    const documents = [
      makeDocument(null, 'Язык права'),
      makeDocument('Б1.О.10', 'Арбитраж'),
      makeDocument('Б1.О.2', 'Яблочное право'),
      makeDocument('Б1.О.2', 'Елочное право'),
      makeDocument(null, 'Административное право'),
    ];

    expect(sortCatalogDocuments(documents).map(({ code, name }) => [code, name])).toEqual([
      ['Б1.О.2', 'Елочное право'],
      ['Б1.О.2', 'Яблочное право'],
      ['Б1.О.10', 'Арбитраж'],
      [null, 'Административное право'],
      [null, 'Язык права'],
    ]);
    expect(documents[0]?.code).toBeNull();
    expect(
      compareCatalogDocuments(
        makeDocument('Б1.О.2', 'Яблочное право'),
        makeDocument('Б1.О.10', 'Арбитраж'),
      ),
    ).toBeLessThan(0);
  });
});
