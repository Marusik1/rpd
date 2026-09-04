import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { CatalogProvider } from '../catalog/catalog-provider.js';
import { TelegramProvider } from '../telegram/telegram-provider.js';
export function AppProviders({ children }: { children: ReactNode }) { return <HashRouter><TelegramProvider><CatalogProvider>{children}</CatalogProvider></TelegramProvider></HashRouter>; }
