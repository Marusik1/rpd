export type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'success'; message: string } | { status: 'error'; message: string };

export function normalizeWorkerBaseUrl(value: string): URL {
  const url = new URL(value);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if ((!local && url.protocol !== 'https:') || (local && !['http:', 'https:'].includes(url.protocol)) || url.username || url.password || url.search || url.hash) throw new TypeError('Некорректный адрес сервиса отправки');
  if (url.pathname !== '/' && url.pathname !== '') throw new TypeError('Адрес сервиса не должен содержать путь');
  url.pathname = url.pathname.replace(/\/*$/u, '/');
  return url;
}

export function boundedSendError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Сервис не ответил вовремя. Попробуйте ещё раз.';
  return 'Не удалось отправить документ. Попробуйте ещё раз.';
}
