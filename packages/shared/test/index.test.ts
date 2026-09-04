import { describe, expect, it } from 'vitest';

import * as shared from '../src/index.js';

describe('shared package entry point', () => {
  it('exports catalog, filename, identity, URL, and search contracts', () => {
    expect(shared).toMatchObject({
      parsePdfFilename: expect.any(Function),
      createDocumentId: expect.any(Function),
      validateCatalogDocuments: expect.any(Function),
      buildDocumentUrl: expect.any(Function),
      siteBaseFromCatalogUrl: expect.any(Function),
      matchesDocumentSearch: expect.any(Function),
      sortCatalogDocuments: expect.any(Function),
    });
  });
});
