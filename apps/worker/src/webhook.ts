import type { Env } from './env.js';

const SECRET_HEADER = 'X-Telegram-Bot-Api-Secret-Token';
const TELEGRAM_API_ROOT = 'https://api.telegram.org';
const TELEGRAM_TIMEOUT_MILLISECONDS = 10_000;

interface TelegramUpdate {
  message?: {
    chat?: { id?: number };
    text?: string;
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export function hasValidWebhookSecret(request: Request, expectedSecret: string): boolean {
  const suppliedSecret = request.headers.get(SECRET_HEADER);
  return suppliedSecret !== null && expectedSecret.length > 0 && constantTimeEqual(suppliedSecret, expectedSecret);
}

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { message } = value as { message?: unknown };
  if (message === undefined) return true;
  return Boolean(message && typeof message === 'object' && !Array.isArray(message));
}

function isStartCommand(text: string | undefined): boolean {
  if (!text) return false;
  return /^\/start(?:@[A-Za-z0-9_]+)?(?:\s|$)/u.test(text);
}

async function sendStartMessage(env: Env, chatId: number, fetcher: typeof fetch): Promise<boolean> {
  const endpoint = `${TELEGRAM_API_ROOT}/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`;
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Откройте каталог РПД, чтобы найти рабочую программу дисциплины.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть каталог РПД', web_app: { url: env.MINI_APP_URL } }]],
      },
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MILLISECONDS),
  });
  return response.ok;
}

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!hasValidWebhookSecret(request, env.TELEGRAM_WEBHOOK_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Malformed update' }, { status: 400 });
  }

  if (!isTelegramUpdate(payload)) {
    return Response.json({ error: 'Malformed update' }, { status: 400 });
  }

  const { message } = payload;
  if (!isStartCommand(message?.text) || typeof message?.chat?.id !== 'number') {
    return Response.json({ ok: true });
  }

  try {
    const delivered = await sendStartMessage(env, message.chat.id, fetcher);
    if (!delivered) return Response.json({ error: 'Telegram request failed' }, { status: 502 });
  } catch {
    return Response.json({ error: 'Telegram request failed' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
