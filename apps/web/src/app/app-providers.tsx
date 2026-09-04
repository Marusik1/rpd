import type { ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { CatalogProvider } from '../catalog/catalog-provider.js';
export function AppProviders({ children }: { children: ReactNode }) { return <HashRouter><CatalogProvider>{children}</CatalogProvider></HashRouter>; }
