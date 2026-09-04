import { describe, expect, it, vi } from 'vitest';
import { createTelegramAdapter, readTelegramViewport } from './telegram-adapter.js';
describe('Telegram adapter', () => {
  it('is absent in an ordinary browser and uses viewport fallbacks', () => { delete window.Telegram; expect(createTelegramAdapter()).toBeNull(); expect(readTelegramViewport({})).toMatchObject({ safeAreaInset: { top: 0 }, contentSafeAreaInset: { bottom: 0 } }); });
  it('initializes capabilities and cleans up the BackButton listener', () => { const offClick = vi.fn(); const app = { ready: vi.fn(), expand: vi.fn(), BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick } }; window.Telegram = { WebApp: app }; const adapter = createTelegramAdapter()!; adapter.initialize(); const cleanup = adapter.setBackButton(true, vi.fn()); cleanup(); expect(app.ready).toHaveBeenCalled(); expect(app.BackButton.show).toHaveBeenCalled(); expect(offClick).toHaveBeenCalled(); });
});
