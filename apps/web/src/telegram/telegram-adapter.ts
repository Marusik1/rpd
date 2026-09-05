export type TelegramTheme = Record<string, string | undefined>;

export type TelegramViewport = {
  height: number;
  stableHeight: number;
  safeAreaInset: { top: number; right: number; bottom: number; left: number };
  contentSafeAreaInset: { top: number; right: number; bottom: number; left: number };
};

export interface TelegramAdapter {
  readonly isTelegram: boolean;
  readonly initData: string;
  readonly theme: TelegramTheme;
  initialize(): void;
  subscribeViewport(listener: (viewport: TelegramViewport) => void): () => void;
  subscribeActivation(listener: () => void): () => void;
  setBackButton(visible: boolean, listener: () => void): () => void;
  openLink(url: string): boolean;
  notify(kind: 'success' | 'error'): void;
}

type Insets = Partial<TelegramViewport['safeAreaInset']>;
type WebApp = {
  initData?: string;
  themeParams?: TelegramTheme;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  ready?: () => void;
  expand?: () => void;
  onEvent?: (event: string, listener: () => void) => void;
  offEvent?: (event: string, listener: () => void) => void;
  openLink?: (url: string) => void;
  BackButton?: { show(): void; hide(): void; onClick(listener: () => void): void; offClick(listener: () => void): void };
  HapticFeedback?: { notificationOccurred(kind: 'success' | 'error'): void };
};

declare global { interface Window { Telegram?: { WebApp?: WebApp } } }

const zeroInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const insets = (value?: Insets) => ({ ...zeroInsets, ...value });

export function readTelegramViewport(webApp: WebApp, viewport = window.visualViewport): TelegramViewport {
  const fallbackHeight = viewport?.height ?? window.innerHeight;
  return {
    height: webApp.viewportHeight ?? fallbackHeight,
    stableHeight: webApp.viewportStableHeight ?? fallbackHeight,
    safeAreaInset: insets(webApp.safeAreaInset),
    contentSafeAreaInset: insets(webApp.contentSafeAreaInset),
  };
}

export function createTelegramAdapter(): TelegramAdapter | null {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return null;
  return {
    isTelegram: true, initData: webApp.initData ?? '', theme: webApp.themeParams ?? {},
    initialize() { webApp.ready?.(); webApp.expand?.(); },
    subscribeViewport(listener) {
      const update = () => listener(readTelegramViewport(webApp));
      webApp.onEvent?.('viewportChanged', update);
      window.visualViewport?.addEventListener('resize', update);
      update();
      return () => { webApp.offEvent?.('viewportChanged', update); window.visualViewport?.removeEventListener('resize', update); };
    },
    subscribeActivation(listener) {
      webApp.onEvent?.('activated', listener);
      return () => webApp.offEvent?.('activated', listener);
    },
    setBackButton(visible, listener) {
      if (!webApp.BackButton) return () => undefined;
      if (visible) { webApp.BackButton.show(); webApp.BackButton.onClick(listener); }
      else webApp.BackButton.hide();
      return () => { webApp.BackButton?.offClick(listener); };
    },
    openLink(url) { if (!webApp.openLink) return false; webApp.openLink(url); return true; },
    notify(kind) { try { webApp.HapticFeedback?.notificationOccurred(kind); } catch { /* capability is optional */ } },
  };
}
