import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createBrowserAdapter } from './browser-adapter.js';
import { createTelegramAdapter, type TelegramAdapter, type TelegramViewport } from './telegram-adapter.js';

const Context = createContext<TelegramAdapter | null>(null);
const px = (value: number) => `${Math.max(0, value)}px`;
const telegramThemeVariables: Record<string, string> = {
  bg_color: '--tg-theme-bg-color',
  text_color: '--tg-theme-text-color',
  hint_color: '--tg-theme-hint-color',
  secondary_bg_color: '--tg-theme-secondary-bg-color',
  button_text_color: '--tg-theme-button-text-color',
};
const safeColor = (value: string | undefined): value is string => Boolean(value && /^#[0-9a-f]{6}$/iu.test(value));
export function applyTelegramTheme(theme: TelegramAdapter['theme']): void {
  const style = document.documentElement.style;
  for (const [key, variable] of Object.entries(telegramThemeVariables)) {
    const value = theme[key];
    if (safeColor(value)) style.setProperty(variable, value);
    else style.removeProperty(variable);
  }
}
function applyViewport(value: TelegramViewport): void {
  const style = document.documentElement.style;
  style.setProperty('--tg-viewport-height', px(value.height)); style.setProperty('--tg-viewport-stable-height', px(value.stableHeight));
  for (const [name, amount] of Object.entries(value.safeAreaInset)) style.setProperty(`--tg-safe-area-inset-${name}`, px(amount));
  for (const [name, amount] of Object.entries(value.contentSafeAreaInset)) style.setProperty(`--tg-content-safe-area-inset-${name}`, px(amount));
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createTelegramAdapter() ?? createBrowserAdapter(), []);
  const location = useLocation(); const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { adapter.initialize(); applyTelegramTheme(adapter.theme); return adapter.subscribeViewport(applyViewport); }, [adapter]);
  useEffect(() => {
    if (!adapter.isTelegram) return;
    const showHome = () => navigateRef.current('/', { replace: true });
    showHome();
    return adapter.subscribeActivation(showHome);
  }, [adapter]);
  useEffect(() => adapter.setBackButton(location.pathname !== '/', () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) navigate(-1);
    else navigate('/', { replace: true });
  }), [adapter, location.pathname, navigate]);
  return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
export function useTelegram(): TelegramAdapter { const adapter = useContext(Context); if (!adapter) throw new Error('TelegramProvider is missing'); return adapter; }
