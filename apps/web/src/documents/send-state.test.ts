import { describe, expect, it } from 'vitest';
import { normalizeWorkerBaseUrl } from './send-state.js';
describe('Worker URL configuration', () => {
  it('accepts an HTTPS origin and normalizes its trailing slash', () => expect(normalizeWorkerBaseUrl('https://worker.example/').href).toBe('https://worker.example/'));
  it.each(['http://worker.example', 'https://user:pass@worker.example', 'https://worker.example/?x=1', 'https://worker.example/#x'])('rejects unsafe configuration %s', (value) => expect(() => normalizeWorkerBaseUrl(value)).toThrow());
  it('permits explicit localhost development', () => expect(normalizeWorkerBaseUrl('http://localhost:8787').href).toBe('http://localhost:8787/'));
});
