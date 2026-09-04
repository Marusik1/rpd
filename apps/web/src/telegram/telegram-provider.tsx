import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createBrowserAdapter } from './browser-adapter.js';
import { createTelegramAdapter, type TelegramAdapter, type TelegramViewport } from './telegram-adapter.js';

const Context = createContext<TelegramAdapter | null>(null);
const px = (value: number) => `${Math.max(0, value)}px`;
function applyViewport(value: TelegramViewport): void {
  const style = document.documentElement.style;
  style.setProperty('--tg-viewport-height', px(value.height)); style.setProperty('--tg-viewport-stable-height', px(value.stableHeight));
  for (const [name, amount] of Object.entries(value.safeAreaInset)) style.setProperty(`--tg-safe-area-inset-${name}`, px(amount));
  for (const [name, amount] of Object.entries(value.contentSafeAreaInset)) style.setProperty(`--tg-content-safe-area-inset-${name}`, px(amount));
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createTelegramAdapter() ?? createBrowserAdapter(), []);
  const location = useLocation(); const navigate = useNavigate();
  useEffect(() => { adapter.initialize(); return adapter.subscribeViewport(applyViewport); }, [adapter]);
  useEffect(() => adapter.setBackButton(location.pathname !== '/', () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) navigate(-1);
    else navigate('/', { replace: true });
  }), [adapter, location.pathname, navigate]);
  return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
export function useTelegram(): TelegramAdapter { const adapter = useContext(Context); if (!adapter) throw new Error('TelegramProvider is missing'); return adapter; }
