import type { Env } from './env.js';
import { isDevelopment } from './env.js';

function normalizedOrigin(value: string | undefined, localhostOnly: boolean): string | null {
  if (!value || value === '*') return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password || url.search || url.hash) return null;
    if (localhostOnly && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
    if (!localhostOnly && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function allowedOrigin(request: Request, env: Env): string | null {
  const requestOrigin = request.headers.get('Origin');
  if (!requestOrigin) return null;
  const production = normalizedOrigin(env.MINI_APP_ORIGIN, false);
  if (requestOrigin === production) return requestOrigin;
  const development = isDevelopment(env) ? normalizedOrigin(env.DEV_MINI_APP_ORIGIN, true) : null;
  return requestOrigin === development ? requestOrigin : null;
}

export function corsHeaders(origin: string): Headers {
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  });
}
