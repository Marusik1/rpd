import { readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  createDocumentId,
  findDocumentIdCollisions,
  normalizeSearchText,
  parsePdfFilename,
  sortCatalogDocuments,
  validateCatalogDocuments,
  type CatalogDocument,
} from '@rpd/shared';

export type ScanWarning = { code: 'possible-duplicate'; paths: string[] };
export type ScanResult = { documents: CatalogDocument[]; warnings: ScanWarning[] };
type Structure = Pick<CatalogDocument, 'level' | 'program' | 'course'>;

const bachelorCourses = new Set(['1', '2', '3', '4', '5']);
const masterCourses = new Set(['1', '2']);
const masterPrograms = new Set(['corporate-law', 'business-legal-support']);

async function findPdfPaths(root: string, directory = ''): Promise<string[]> {
  const absoluteDirectory = path.join(root, ...directory.split('/').filter(Boolean));
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...(await findPdfPaths(root, relativePath)));
    else if (entry.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.pdf'))
      paths.push(relativePath);
  }
  return paths;
}

function deriveStructure(relativePath: string): Structure {
  const segments = relativePath.split('/');
  if (
    segments.length === 4 &&
    segments[0] === 'documents' &&
    segments[1] === 'bachelor' &&
    bachelorCourses.has(segments[2] ?? '')
  ) {
    return { level: 'bachelor', program: null, course: Number(segments[2]) };
  }
  if (
    segments.length === 5 &&
    segments[0] === 'documents' &&
    segments[1] === 'master' &&
    masterPrograms.has(segments[2] ?? '') &&
    masterCourses.has(segments[3] ?? '')
  ) {
    return {
      level: 'master',
      program: segments[2] as 'corporate-law' | 'business-legal-support',
      course: Number(segments[3]),
    };
  }
  throw new TypeError(`invalid PDF structure: ${relativePath}`);
}

function duplicateWarnings(documents: readonly CatalogDocument[]): ScanWarning[] {
  const groups = new Map<string, string[]>();
  for (const document of documents) {
    const key = [
      document.level,
      document.program ?? '-',
      document.course,
      normalizeSearchText(document.code ?? ''),
      normalizeSearchText(document.name),
    ].join('\u0000');
    const paths = groups.get(key) ?? [];
    paths.push(document.path);
    groups.set(key, paths);
  }
  return [...groups.values()]
    .filter((paths) => paths.length > 1)
    .map((paths) => ({ code: 'possible-duplicate' as const, paths: [...paths].sort() }))
    .sort((left, right) => (left.paths[0] ?? '').localeCompare(right.paths[0] ?? '', 'ru'));
}

export async function scanDocuments(root: string): Promise<ScanResult> {
  const relativePaths = (await findPdfPaths(root)).sort();
  const documents = relativePaths.map((relativePath) => {
    const structure = deriveStructure(relativePath);
    const filename = path.posix.basename(relativePath);
    const parsed = parsePdfFilename(filename);
    return {
      id: createDocumentId({ ...structure, filename }),
      ...structure,
      ...parsed,
      filename,
      path: relativePath,
    } satisfies CatalogDocument;
  });
  const validation = validateCatalogDocuments(documents);
  if (!validation.success) {
    const details = validation.errors
      .map(({ path: issuePath, message }) => `${issuePath.join('.')}: ${message}`)
      .join('; ');
    throw new TypeError(`invalid catalog document: ${details}`);
  }
  const collisions = findDocumentIdCollisions(validation.data);
  if (collisions.length > 0) throw new TypeError(`document ID collision: ${collisions.join(', ')}`);
  const sorted = sortCatalogDocuments(validation.data);
  return { documents: sorted, warnings: duplicateWarnings(sorted) };
}

export function serializeCatalog(documents: readonly CatalogDocument[]): string {
  return `${JSON.stringify({ version: 1, documents }, null, 2)}\n`;
}
