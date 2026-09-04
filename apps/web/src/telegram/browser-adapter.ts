import type { TelegramAdapter, TelegramViewport } from './telegram-adapter.js';

function viewport(): TelegramViewport {
  const height = window.visualViewport?.height ?? window.innerHeight;
  return { height, stableHeight: height, safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 }, contentSafeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 } };
}

export function createBrowserAdapter(): TelegramAdapter {
  return {
    initData: '', theme: {}, initialize() {},
    subscribeViewport(listener) { const update = () => listener(viewport()); window.visualViewport?.addEventListener('resize', update); window.addEventListener('resize', update); update(); return () => { window.visualViewport?.removeEventListener('resize', update); window.removeEventListener('resize', update); }; },
    setBackButton() { return () => undefined; },
    openLink() { return false; },
    notify() {},
  };
}
