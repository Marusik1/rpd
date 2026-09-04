// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createTelegramAdapter, readTelegramViewport } from './telegram-adapter.js';
import { applyTelegramTheme } from './telegram-provider.js';
describe('Telegram adapter', () => {
  it('is absent in an ordinary browser and uses viewport fallbacks', () => { delete window.Telegram; expect(createTelegramAdapter()).toBeNull(); expect(readTelegramViewport({})).toMatchObject({ safeAreaInset: { top: 0 }, contentSafeAreaInset: { bottom: 0 } }); });
  it('initializes capabilities and cleans up the BackButton listener', () => { const offClick = vi.fn(); const app = { ready: vi.fn(), expand: vi.fn(), BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick } }; window.Telegram = { WebApp: app }; const adapter = createTelegramAdapter(); expect(adapter).not.toBeNull(); if (!adapter) throw new Error('Telegram adapter was not created'); adapter.initialize(); const cleanup = adapter.setBackButton(true, vi.fn()); cleanup(); expect(app.ready).toHaveBeenCalled(); expect(app.BackButton.show).toHaveBeenCalled(); expect(offClick).toHaveBeenCalled(); });
  it('applies safe Telegram theme colors without replacing the red brand token', () => { applyTelegramTheme({ bg_color: '#101010', text_color: '#fefefe', hint_color: 'red' }); expect(document.documentElement.style.getPropertyValue('--tg-theme-bg-color')).toBe('#101010'); expect(document.documentElement.style.getPropertyValue('--tg-theme-text-color')).toBe('#fefefe'); expect(document.documentElement.style.getPropertyValue('--tg-theme-hint-color')).toBe(''); expect(document.documentElement.style.getPropertyValue('--brand')).toBe(''); });
});
