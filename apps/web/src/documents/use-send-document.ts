import { useCallback, useRef, useState } from 'react';
import { useTelegram } from '../telegram/telegram-provider.js';
import { boundedSendError, normalizeWorkerBaseUrl, type SendState } from './send-state.js';

export function useSendDocument(documentId: string) {
  const telegram = useTelegram(); const [state, setState] = useState<SendState>({ status: 'idle' }); const pending = useRef(false);
  const send = useCallback(async () => {
    if (pending.current) return;
    if (!telegram.initData) { setState({ status: 'error', message: 'Откройте приложение в Telegram, чтобы получить документ.' }); telegram.notify('error'); return; }
    let base: URL; try { base = normalizeWorkerBaseUrl(import.meta.env.VITE_WORKER_URL ?? ''); } catch { setState({ status: 'error', message: 'Отправка временно не настроена.' }); telegram.notify('error'); return; }
    pending.current = true; setState({ status: 'sending' }); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(new URL('api/send-document', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ initData: telegram.initData, documentId }), signal: controller.signal });
      if (!response.ok) throw new Error('send failed');
      setState({ status: 'success', message: 'РПД отправлена в чат' }); telegram.notify('success');
    } catch (error) { setState({ status: 'error', message: boundedSendError(error) }); telegram.notify('error'); }
    finally { window.clearTimeout(timeout); pending.current = false; }
  }, [documentId, telegram]);
  return { state, send };
}
