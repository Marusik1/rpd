import {
  buildDocumentUrl,
  siteBaseFromCatalogUrl,
  validateCatalogDocuments,
  type CatalogDocument,
} from '@rpd/shared';

const CACHE_MILLISECONDS = 5 * 60 * 1000;
const TIMEOUT_MILLISECONDS = 10_000;

type CacheEntry = { catalogUrl: string; expiresAt: number; documents: CatalogDocument[] };
let cache: CacheEntry | null = null;

export class CatalogError extends Error {
  constructor(message = 'Document catalog is unavailable') {
    super(message);
    this.name = 'CatalogError';
  }
}

function catalogUrl(value: string): URL {
  try {
    const url = new URL(value);
    siteBaseFromCatalogUrl(url);
    return url;
  } catch {
    throw new CatalogError('Document catalog is misconfigured');
  }
}

async function fetchCatalog(url: URL, fetcher: typeof fetch): Promise<CatalogDocument[]> {
  const signal = AbortSignal.timeout(TIMEOUT_MILLISECONDS);
  let response: Response;
  try {
    response = await fetcher(url, { signal, headers: { Accept: 'application/json' } });
  } catch {
    throw new CatalogError();
  }
  if (!response.ok) throw new CatalogError();
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CatalogError();
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new CatalogError();
  const record = payload as Record<string, unknown>;
  if (record.version !== 1 || Object.keys(record).some((key) => key !== 'version' && key !== 'documents')) {
    throw new CatalogError();
  }
  const result = validateCatalogDocuments(record.documents);
  if (!result.success) throw new CatalogError();
  return result.data;
}

async function documents(configuredUrl: string, force: boolean, fetcher: typeof fetch, now: number): Promise<CatalogDocument[]> {
  const url = catalogUrl(configuredUrl);
  if (!force && cache?.catalogUrl === url.href && cache.expiresAt > now) return cache.documents;
  const loaded = await fetchCatalog(url, fetcher);
  cache = { catalogUrl: url.href, documents: loaded, expiresAt: now + CACHE_MILLISECONDS };
  return loaded;
}

export type TrustedDocument = { document: CatalogDocument; url: URL };

export async function findTrustedDocument(
  configuredUrl: string,
  documentId: string,
  options: { fetcher?: typeof fetch; now?: number } = {},
): Promise<TrustedDocument | null> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now();
  let current = await documents(configuredUrl, false, fetcher, now);
  let document = current.find(({ id }) => id === documentId);
  if (!document) {
    current = await documents(configuredUrl, true, fetcher, now);
    document = current.find(({ id }) => id === documentId);
  }
  if (!document) return null;
  const configured = catalogUrl(configuredUrl);
  const siteBaseUrl = siteBaseFromCatalogUrl(configured);
  return { document, url: buildDocumentUrl({ siteBaseUrl, relativeDocumentPath: document.path }) };
}

export function resetCatalogCacheForTests(): void {
  cache = null;
}
