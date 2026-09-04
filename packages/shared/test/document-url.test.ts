import { describe, expect, it } from 'vitest';

import {
  buildDocumentUrl,
  isTrustedDocumentUrl,
  siteBaseFromCatalogUrl,
} from '../src/document-url.js';

const pagesBase = new URL('https://example.github.io/rpd-app/');

describe('buildDocumentUrl', () => {
  it('encodes every filename segment exactly once under a Project Pages base', () => {
    const relativeDocumentPath = 'documents/bachelor/1/Б1.О.01 Право (РПД).pdf';
    const url = buildDocumentUrl({ siteBaseUrl: pagesBase, relativeDocumentPath });

    expect(url.href).toBe(
      'https://example.github.io/rpd-app/documents/bachelor/1/%D0%911.%D0%9E.01%20%D0%9F%D1%80%D0%B0%D0%B2%D0%BE%20(%D0%A0%D0%9F%D0%94).pdf',
    );
    expect(
      buildDocumentUrl({
        siteBaseUrl: pagesBase,
        relativeDocumentPath: 'documents/bachelor/1/My%20File.pdf',
      }).pathname,
    ).toMatch(/\/documents\/bachelor\/1\/My%20File\.pdf$/u);
  });

  it.each([
    '../secret.pdf',
    'documents/%2e%2e/secret.pdf',
    'documents/%2Fetc/passwd.pdf',
    '/documents/bachelor/1/file.pdf',
    'https://evil.example/file.pdf',
    'documents/file.pdf?download=1',
    'documents/file.pdf#page=1',
  ])('rejects unsafe path %s', (relativeDocumentPath) => {
    expect(() => buildDocumentUrl({ siteBaseUrl: pagesBase, relativeDocumentPath })).toThrow();
  });

  it('requires HTTPS except for local test servers', () => {
    expect(() =>
      buildDocumentUrl({
        siteBaseUrl: new URL('http://example.com/app/'),
        relativeDocumentPath: 'documents/file.pdf',
      }),
    ).toThrow();
    expect(
      buildDocumentUrl({
        siteBaseUrl: new URL('http://localhost:4173/app/'),
        relativeDocumentPath: 'documents/file.pdf',
      }).href,
    ).toBe('http://localhost:4173/app/documents/file.pdf');
  });
});

describe('isTrustedDocumentUrl', () => {
  it('accepts clean URLs below the configured Pages base only', () => {
    const trusted = buildDocumentUrl({
      siteBaseUrl: pagesBase,
      relativeDocumentPath: 'documents/master/corporate-law/1/file.pdf',
    });

    expect(isTrustedDocumentUrl({ candidate: trusted, siteBaseUrl: pagesBase })).toBe(true);
    expect(
      isTrustedDocumentUrl({ candidate: new URL('https://evil.example/rpd-app/file.pdf'), siteBaseUrl: pagesBase }),
    ).toBe(false);
    expect(
      isTrustedDocumentUrl({ candidate: new URL('https://example.github.io/file.pdf'), siteBaseUrl: pagesBase }),
    ).toBe(false);
    expect(
      isTrustedDocumentUrl({ candidate: new URL(`${trusted.href}?download=1`), siteBaseUrl: pagesBase }),
    ).toBe(false);
  });
});

describe('siteBaseFromCatalogUrl', () => {
  it('derives the trailing-slash parent base from catalog.json', () => {
    expect(siteBaseFromCatalogUrl(new URL('https://example.github.io/rpd-app/catalog.json')).href).toBe(
      pagesBase.href,
    );
  });

  it.each([
    'https://example.github.io/rpd-app/catalog.json?x=1',
    'https://example.github.io/rpd-app/catalog.json#x',
    'https://user:pass@example.github.io/rpd-app/catalog.json',
    'https://example.github.io/rpd-app/catalog.json/extra',
    'http://example.github.io/rpd-app/catalog.json',
  ])('rejects an unsafe catalog URL: %s', (catalogUrl) => {
    expect(() => siteBaseFromCatalogUrl(new URL(catalogUrl))).toThrow();
  });
});
