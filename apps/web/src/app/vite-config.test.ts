import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import config from '../../vite.config.js';

describe('Vite web configuration', () => {
  it('serves the repository public directory and emits to the web workspace', () => {
    expect(config.publicDir).toBe('../../public');
    expect(config.build?.outDir).toBe('dist');
  });

  it('loads the official Telegram bridge before the application module', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html.indexOf('https://telegram.org/js/telegram-web-app.js')).toBeGreaterThan(-1);
    expect(html.indexOf('https://telegram.org/js/telegram-web-app.js')).toBeLessThan(html.indexOf('/src/main.tsx'));
  });
});
