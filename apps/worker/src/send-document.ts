import type { Env } from './env.js';
import { CatalogError, findTrustedDocument } from './catalog-client.js';
import { InitDataError, validateInitData } from './init-data.js';
import { sendTelegramDocument, TelegramApiError } from './telegram-api.js';

const MAX_BODY_BYTES = 16 * 1024;
const DOCUMENT_ID = /^[A-Za-z0-9_-]+$/u;

type Dependencies = { fetcher?: typeof fetch; nowSeconds?: number; nowMilliseconds?: number };

function json(status: number, body: object): Response {
  return Response.json(body, { status });
}

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('Request body too large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(body);
}

export async function handleSendDocument(request: Request, env: Env, dependencies: Dependencies = {}): Promise<Response> {
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return json(415, { error: 'Требуется JSON' });
  const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json(413, { error: 'Запрос слишком большой' });

  let text: string;
  try {
    text = await readBoundedBody(request);
  } catch (error) {
    if (error instanceof RangeError) return json(413, { error: 'Запрос слишком большой' });
    return json(400, { error: 'Некорректный запрос' });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return json(400, { error: 'Некорректный JSON' });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json(400, { error: 'Некорректный запрос' });
  const keys = Object.keys(payload);
  const body = payload as Record<string, unknown>;
  if (
    keys.length !== 2 ||
    !keys.includes('documentId') ||
    !keys.includes('initData') ||
    typeof body.documentId !== 'string' ||
    typeof body.initData !== 'string' ||
    !DOCUMENT_ID.test(body.documentId)
  ) {
    return json(400, { error: 'Некорректный запрос' });
  }

  try {
    const identity = await validateInitData(body.initData, env.BOT_TOKEN, dependencies.nowSeconds);
    const trusted = await findTrustedDocument(env.PUBLIC_CATALOG_URL, body.documentId, {
      ...(dependencies.fetcher ? { fetcher: dependencies.fetcher } : {}),
      ...(dependencies.nowMilliseconds === undefined ? {} : { now: dependencies.nowMilliseconds }),
    });
    if (!trusted) return json(404, { error: 'Документ не найден' });
    await sendTelegramDocument({
      botToken: env.BOT_TOKEN,
      chatId: identity.id,
      documentUrl: trusted.url,
      document: trusted.document,
      ...(dependencies.fetcher ? { fetcher: dependencies.fetcher } : {}),
    });
    return json(200, { ok: true });
  } catch (error) {
    if (error instanceof InitDataError) return json(401, { error: 'Не удалось подтвердить Telegram' });
    if (error instanceof CatalogError) return json(503, { error: 'Каталог временно недоступен' });
    if (error instanceof TelegramApiError) return json(502, { error: 'Не удалось отправить документ' });
    return json(500, { error: 'Внутренняя ошибка' });
  }
}
