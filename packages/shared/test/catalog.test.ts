import { describe, expect, it } from 'vitest';

import {
  findDocumentIdCollisions,
  validateCatalogDocuments,
  type CatalogDocument,
} from '../src/catalog.js';
import { createDocumentId } from '../src/document-id.js';

const bachelor = {
  level: 'bachelor' as const,
  program: null,
  course: 2,
  code: 'Б1.О.01',
  name: 'Гражданское право',
  filename: 'Б1.О.01 Гражданское право (РПД).pdf',
  path: 'documents/bachelor/2/Б1.О.01 Гражданское право (РПД).pdf',
};

describe('createDocumentId', () => {
  it('is deterministic, URL-safe, and sensitive to structural fields', () => {
    const id = createDocumentId(bachelor);

    expect(createDocumentId({ ...bachelor })).toBe(id);
    expect(id).toMatch(/^[a-z0-9_-]+-[a-f0-9]{12}$/u);
    expect(createDocumentId({ ...bachelor, course: 3 })).not.toBe(id);
    expect(createDocumentId({ ...bachelor, filename: `Копия ${bachelor.filename}` })).not.toBe(id);
  });

  it('does not depend on a document array position', () => {
    const master = {
      ...bachelor,
      level: 'master' as const,
      program: 'corporate-law' as const,
      course: 1,
    };

    const firstOrder = [bachelor, master].map(createDocumentId);
    const secondOrder = [master, bachelor].map(createDocumentId).reverse();

    expect(secondOrder).toEqual(firstOrder);
  });
});

describe('validateCatalogDocuments', () => {
  it('returns validated catalog documents', () => {
    const document = { ...bachelor, id: createDocumentId(bachelor) };

    expect(validateCatalogDocuments([document])).toEqual({ success: true, data: [document] });
  });

  it.each([
    [{ ...bachelor, program: 'corporate-law' }, 'Bachelor documents must not have a program'],
    [
      { ...bachelor, level: 'master', program: null, course: 1 },
      'Master documents must have a program',
    ],
    [{ ...bachelor, course: 6 }, 'Bachelor course must be between 1 and 5'],
    [
      { ...bachelor, level: 'master', program: 'corporate-law', course: 3 },
      'Master course must be between 1 and 2',
    ],
    [{ ...bachelor, path: '../secrets.pdf' }, 'Document path must be a safe POSIX relative path'],
    [
      { ...bachelor, path: 'documents/bachelor/2/../secrets.pdf' },
      'Document path must be a safe POSIX relative path',
    ],
    [
      { ...bachelor, path: 'documents\\bachelor\\2\\file.pdf' },
      'Document path must be a safe POSIX relative path',
    ],
    [
      {
        ...bachelor,
        filename: 'nested/file.pdf',
        path: 'documents/bachelor/2/nested/file.pdf',
      },
      'Filename must be a basename',
    ],
  ])('returns structured errors for invalid records', (invalid, message) => {
    const result = validateCatalogDocuments([{ ...invalid, id: createDocumentId(invalid as never) }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.any(Array), message }),
        ]),
      );
    }
  });
});

describe('findDocumentIdCollisions', () => {
  it('reports duplicate IDs for build-time collision checks', () => {
    const document = { ...bachelor, id: createDocumentId(bachelor) } satisfies CatalogDocument;

    expect(findDocumentIdCollisions([document, { ...document, name: 'Другое имя' }])).toEqual([
      document.id,
    ]);
  });
});
