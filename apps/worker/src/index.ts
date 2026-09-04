import { allowedOrigin, corsHeaders } from './cors.js';
import type { Env } from './env.js';
import { handleSendDocument } from './send-document.js';

function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of corsHeaders(origin)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return Response.json({ ok: true });
    if (url.pathname !== '/api/send-document') return Response.json({ error: 'Not found' }, { status: 404 });

    const origin = allowedOrigin(request, env);
    if (!origin) return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'POST') return withCors(Response.json({ error: 'Method not allowed' }, { status: 405 }), origin);
    return withCors(await handleSendDocument(request, env), origin);
  },
} satisfies ExportedHandler<Env>;
