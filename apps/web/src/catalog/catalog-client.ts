import { validateCatalogDocuments, type CatalogDocument } from '@rpd/shared';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export function getCatalogUrl(baseUrl: string): string { return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}catalog.json`; }

export function createCatalogClient(fetcher: Fetcher = fetch, baseUrl = import.meta.env.BASE_URL) {
  let pending: Promise<CatalogDocument[]> | undefined;
  const request = async (): Promise<CatalogDocument[]> => {
    const response = await fetcher(getCatalogUrl(baseUrl), { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Не удалось загрузить каталог');
    const payload: unknown = await response.json();
    const documents = typeof payload === 'object' && payload !== null && 'documents' in payload ? (payload as { documents: unknown }).documents : undefined;
    const result = validateCatalogDocuments(documents);
    if (!result.success) throw new Error('Неверный формат каталога');
    return result.data;
  };
  return { load: () => pending ??= request(), retry: () => { pending = request(); return pending; } };
}

export const catalogClient = createCatalogClient();
