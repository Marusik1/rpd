import { describe, expect, it, vi } from 'vitest';
import { createCatalogClient, getCatalogUrl } from './catalog-client.js';

const document = { id: 'civil-law-1', level: 'bachelor' as const, program: null, course: 1, code: 'B1.O.01', name: 'Гражданское право', filename: 'Гражданское право.pdf', path: 'documents/bachelor/1/Гражданское право.pdf' };

describe('catalog client', () => {
  it('resolves catalog.json beneath the configured base URL', () => expect(getCatalogUrl('/rpd/')).toBe('/rpd/catalog.json'));
  it('loads and validates the catalog once for all consumers', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ version: 1, documents: [document] })));
    const client = createCatalogClient(fetcher, '/rpd/');
    await expect(Promise.all([client.load(), client.load()])).resolves.toEqual([[document], [document]]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith('/rpd/catalog.json', { headers: { accept: 'application/json' } });
  });
  it('rejects invalid contracts and permits an explicit retry', async () => {
    const fetcher = vi.fn<() => Promise<Response>>().mockResolvedValueOnce(new Response('{"documents":[{"id":"unsafe id"}]}')).mockResolvedValueOnce(new Response(JSON.stringify({ version: 1, documents: [document] })));
    const client = createCatalogClient(fetcher, '/');
    await expect(client.load()).rejects.toThrow('каталог');
    await expect(client.retry()).resolves.toEqual([document]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
