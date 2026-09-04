import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findTrustedDocument, resetCatalogCacheForTests } from '../src/catalog-client.js';
import { documentCaption, sendTelegramDocument } from '../src/telegram-api.js';

const catalogUrl = 'https://example.github.io/rpd/catalog.json';
const document = {
  id: 'bachelor-1-abc123', level: 'bachelor' as const, program: null, course: 1,
  code: 'Б1.О.01', name: 'Философия', filename: 'Б1.О.01 Философия.pdf',
  path: 'documents/bachelor/1/Б1.О.01 Философия.pdf',
};
const response = (documents: unknown) => Response.json({ version: 1, documents });

beforeEach(() => resetCatalogCacheForTests());

describe('trusted catalog', () => {
  it('caches for five minutes and derives a shared-validated Pages URL', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([document]));
    const first = await findTrustedDocument(catalogUrl, document.id, { fetcher, now: 100 });
    const second = await findTrustedDocument(catalogUrl, document.id, { fetcher, now: 299_999 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first?.url.href).toContain('/rpd/documents/bachelor/1/');
    expect(second?.document.id).toBe(document.id);
  });
  it('force-refreshes once for an unknown ID', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([]));
    await expect(findTrustedDocument(catalogUrl, 'unknown', { fetcher })).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid schema and catalog URL configuration', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([{ ...document, path: '../escape.pdf' }]));
    await expect(findTrustedDocument(catalogUrl, document.id, { fetcher })).rejects.toThrow('catalog');
    await expect(findTrustedDocument('https://example.com/not-catalog.json?x=1', document.id, { fetcher })).rejects.toThrow('misconfigured');
  });
  it('supplies a ten-second abort signal to catalog requests', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([]));
    await findTrustedDocument(catalogUrl, 'unknown', { fetcher });
    const [, init] = fetcher.mock.calls[0] ?? [];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('Telegram delivery', () => {
  it('sends validated chat, trusted URL and Russian caption', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    await sendTelegramDocument({ botToken: 'secret-token', chatId: 424242, documentUrl: new URL('https://example.github.io/rpd/documents/bachelor/1/test.pdf'), document, fetcher });
    const [, init] = fetcher.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ chat_id: 424242, caption: documentCaption(document) });
    expect(body.document).toBe('https://example.github.io/rpd/documents/bachelor/1/test.pdf');
  });
  it('maps Telegram failures to a bounded sanitized error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: false, description: 'secret upstream detail' }));
    await expect(sendTelegramDocument({ botToken: 'secret-token', chatId: 1, documentUrl: new URL('https://example.github.io/rpd/documents/bachelor/1/test.pdf'), document, fetcher })).rejects.toThrow('Telegram delivery failed');
  });
});
