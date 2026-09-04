type DocumentUrlInput = { siteBaseUrl: URL; relativeDocumentPath: string };

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function assertCleanSecureUrl(url: URL, label: string): void {
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError(`${label} must not contain credentials, query, or hash`);
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalhost(url.hostname))) {
    throw new TypeError(`${label} must use HTTPS outside localhost`);
  }
}

function decodeSafeSegment(segment: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new TypeError('Document path contains invalid percent encoding');
  }
  if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\')) {
    throw new TypeError('Document path contains traversal or an encoded separator');
  }
  return decoded;
}

function canonicalRelativePath(relativePath: string): string {
  if (
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    relativePath.includes('?') ||
    relativePath.includes('#') ||
    /^[a-z][a-z\d+.-]*:/iu.test(relativePath)
  ) {
    throw new TypeError('Document path must be a clean relative path');
  }
  return relativePath.split('/').map(decodeSafeSegment).map(encodeURIComponent).join('/');
}

function assertSiteBase(siteBaseUrl: URL): void {
  assertCleanSecureUrl(siteBaseUrl, 'Site base URL');
  if (!siteBaseUrl.pathname.endsWith('/')) {
    throw new TypeError('Site base URL must end with a slash');
  }
}

export function buildDocumentUrl({ siteBaseUrl, relativeDocumentPath }: DocumentUrlInput): URL {
  assertSiteBase(siteBaseUrl);
  const encodedPath = canonicalRelativePath(relativeDocumentPath);
  const result = new URL(encodedPath, siteBaseUrl);
  if (!isTrustedDocumentUrl({ candidate: result, siteBaseUrl })) {
    throw new TypeError('Document URL escapes the configured site base');
  }
  return result;
}

export function isTrustedDocumentUrl(input: { candidate: URL; siteBaseUrl: URL }): boolean {
  const { candidate, siteBaseUrl } = input;
  try {
    assertSiteBase(siteBaseUrl);
    assertCleanSecureUrl(candidate, 'Document URL');
    if (candidate.origin !== siteBaseUrl.origin || !candidate.pathname.startsWith(siteBaseUrl.pathname)) {
      return false;
    }
    const relative = candidate.pathname.slice(siteBaseUrl.pathname.length);
    const canonical = canonicalRelativePath(relative);
    return new URL(canonical, siteBaseUrl).href === candidate.href;
  } catch {
    return false;
  }
}

export function siteBaseFromCatalogUrl(catalogUrl: URL): URL {
  assertCleanSecureUrl(catalogUrl, 'Catalog URL');
  if (!catalogUrl.pathname.endsWith('/catalog.json')) {
    throw new TypeError('Catalog URL pathname must end with /catalog.json');
  }
  const base = new URL('.', catalogUrl);
  assertSiteBase(base);
  return base;
}
