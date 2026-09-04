import type { CatalogDocument } from './catalog.js';

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/gu, 'е').trim().replace(/\s+/gu, ' ');
}

export function matchesDocumentSearch(
  document: Pick<CatalogDocument, 'code' | 'name'>,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return [document.code, document.name].some(
    (value) => value !== null && normalizeSearchText(value).includes(normalizedQuery),
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function numericCodeComponents(code: string): number[] {
  return [...code.matchAll(/\d+/gu)].map(([component]) => Number(component));
}

export function compareCatalogDocuments(
  left: Pick<CatalogDocument, 'code' | 'name' | 'path'>,
  right: Pick<CatalogDocument, 'code' | 'name' | 'path'>,
): number {
  if (left.code === null && right.code !== null) return 1;
  if (left.code !== null && right.code === null) return -1;
  if (left.code !== null && right.code !== null) {
    const leftComponents = numericCodeComponents(left.code);
    const rightComponents = numericCodeComponents(right.code);
    const length = Math.max(leftComponents.length, rightComponents.length);
    for (let index = 0; index < length; index += 1) {
      const comparison = (leftComponents[index] ?? -1) - (rightComponents[index] ?? -1);
      if (comparison !== 0) return comparison;
    }
  }
  const nameComparison = compareText(normalizeSearchText(left.name), normalizeSearchText(right.name));
  return nameComparison || compareText(normalizeSearchText(left.path), normalizeSearchText(right.path));
}

export function sortCatalogDocuments<T extends CatalogDocument>(documents: readonly T[]): T[] {
  return [...documents].sort(compareCatalogDocuments);
}
