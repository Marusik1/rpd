import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';
import type { Env } from '../src/env.js';

const env: Env = { BOT_TOKEN: 'unused', MINI_APP_ORIGIN: 'https://example.github.io', PUBLIC_CATALOG_URL: 'https://example.github.io/rpd/catalog.json', ENVIRONMENT: 'production' };
const dispatch = (request: Request, customEnv = env) => worker.fetch(request, customEnv);

describe('Worker boundary', () => {
  it('serves health', async () => {
    const response = await dispatch(new Request('https://worker.example/health'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
  it('allows only the exact configured production origin', async () => {
    const allowed = await dispatch(new Request('https://worker.example/api/send-document', { method: 'OPTIONS', headers: { Origin: env.MINI_APP_ORIGIN } }));
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(env.MINI_APP_ORIGIN);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    for (const origin of ['https://evil.example', 'https://example.github.io.evil.example']) {
      const rejected = await dispatch(new Request('https://worker.example/api/send-document', { method: 'OPTIONS', headers: { Origin: origin } }));
      expect(rejected.status).toBe(403);
    }
    const missing = await dispatch(new Request('https://worker.example/api/send-document', { method: 'OPTIONS' }));
    expect(missing.status).toBe(403);
  });
  it('allows one explicit localhost origin only in development', async () => {
    const devEnv: Env = { ...env, ENVIRONMENT: 'development', DEV_MINI_APP_ORIGIN: 'http://localhost:5173' };
    const request = () => new Request('https://worker.example/api/send-document', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
    expect((await dispatch(request(), devEnv)).status).toBe(204);
    expect((await dispatch(request(), { ...devEnv, ENVIRONMENT: 'production' })).status).toBe(403);
  });
  it.each([
    ['text/plain', '{}'], ['application/json', '{'],
    ['application/json', JSON.stringify({ documentId: 'safe-id', initData: 'x', url: 'https://evil.example' })],
    ['application/json', JSON.stringify({ documentId: 'safe-id', initData: 'x', userId: 1 })],
    ['application/json', JSON.stringify({ documentId: '../escape', initData: 'x' })],
  ])('rejects malformed input before upstream calls', async (contentType, body) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await dispatch(new Request('https://worker.example/api/send-document', { method: 'POST', headers: { Origin: env.MINI_APP_ORIGIN, 'Content-Type': contentType }, body }));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it('rejects oversized bodies and wrong methods', async () => {
    const oversized = await dispatch(new Request('https://worker.example/api/send-document', { method: 'POST', headers: { Origin: env.MINI_APP_ORIGIN, 'Content-Type': 'application/json' }, body: 'x'.repeat(16 * 1024 + 1) }));
    expect(oversized.status).toBe(413);
    const wrong = await dispatch(new Request('https://worker.example/api/send-document', { method: 'GET', headers: { Origin: env.MINI_APP_ORIGIN } }));
    expect(wrong.status).toBe(405);
  });
});
