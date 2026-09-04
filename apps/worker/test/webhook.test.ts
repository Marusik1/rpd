import { describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/env.js';
import worker from '../src/index.js';

const env: Env = {
  BOT_TOKEN: 'test-bot-token',
  TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret',
  MINI_APP_URL: 'https://example.pages.dev/app/',
  MINI_APP_ORIGIN: 'https://example.pages.dev',
  PUBLIC_CATALOG_URL: 'https://example.pages.dev/catalog.json',
  ENVIRONMENT: 'production',
};

function webhookRequest(payload: unknown, secret?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (secret !== undefined) headers.set('X-Telegram-Bot-Api-Secret-Token', secret);
  return new Request('https://worker.example/telegram/webhook', {
    method: 'POST',
    headers,
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

describe('Telegram webhook', () => {
  it.each([undefined, 'wrong-secret', 'uest-webhook-secret', 'test-webhook-secret-extra'])(
    'rejects a missing or mismatched secret without calling Telegram',
    async (secret) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const response = await worker.fetch(webhookRequest({ update_id: 1 }, secret), env);
      expect(response.status).toBe(401);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    },
  );

  it('accepts the exact secret and safely acknowledges unsupported updates', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await worker.fetch(
      webhookRequest({ update_id: 1, callback_query: {} }, env.TELEGRAM_WEBHOOK_SECRET),
      env,
    );
    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects malformed JSON without leaking the secret', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = await worker.fetch(
      webhookRequest('{not-json', env.TELEGRAM_WEBHOOK_SECRET),
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(env.TELEGRAM_WEBHOOK_SECRET);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('answers /start with Russian copy and the configured Web App URL only', async () => {
    const attackerUrl = 'https://attacker.example/';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    const response = await worker.fetch(
      webhookRequest(
        { update_id: 1, message: { chat: { id: 42 }, text: `/start ${attackerUrl}` } },
        env.TELEGRAM_WEBHOOK_SECRET,
      ),
      env,
    );
    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body)) as {
      text: string;
      reply_markup: { inline_keyboard: Array<Array<{ web_app: { url: string } }>> };
    };
    expect(body.text).toMatch(/[А-Яа-яЁё]/u);
    expect(body.reply_markup.inline_keyboard[0]?.[0]?.web_app.url).toBe(env.MINI_APP_URL);
    expect(JSON.stringify(body)).not.toContain(attackerUrl);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    fetchSpy.mockRestore();
  });
});
