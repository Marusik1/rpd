import type { CatalogDocument } from '@rpd/shared';

const TIMEOUT_MILLISECONDS = 10_000;

export class TelegramApiError extends Error {
  constructor() {
    super('Telegram delivery failed');
    this.name = 'TelegramApiError';
  }
}

export function documentCaption(document: CatalogDocument): string {
  return `РПД: ${document.name}${document.code ? ` (${document.code})` : ''}`;
}

export async function sendTelegramDocument(input: {
  botToken: string;
  chatId: number;
  documentUrl: URL;
  document: CatalogDocument;
  fetcher?: typeof fetch;
}): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${encodeURIComponent(input.botToken)}/sendDocument`;
  try {
    const response = await (input.fetcher ?? fetch)(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: input.chatId,
        document: input.documentUrl.href,
        caption: documentCaption(input.document),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MILLISECONDS),
    });
    if (!response.ok) throw new TelegramApiError();
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || (payload as { ok?: unknown }).ok !== true) throw new TelegramApiError();
  } catch (error) {
    if (error instanceof TelegramApiError) throw error;
    throw new TelegramApiError();
  }
}
