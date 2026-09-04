import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CatalogDocument } from '@rpd/shared';
import { catalogClient } from './catalog-client.js';

type State = { documents: CatalogDocument[]; status: 'loading' | 'ready' | 'error'; retry: () => void };
const Context = createContext<State | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<State, 'retry'>>({ documents: [], status: 'loading' });
  const load = (retry = false) => { setState({ documents: [], status: 'loading' }); (retry ? catalogClient.retry() : catalogClient.load()).then((documents) => setState({ documents, status: 'ready' })).catch(() => setState({ documents: [], status: 'error' })); };
  useEffect(() => { load(); }, []);
  return <Context.Provider value={{ ...state, retry: () => load(true) }}>{children}</Context.Provider>;
}
export function useCatalog(): State { const value = useContext(Context); if (!value) throw new Error('CatalogProvider is missing'); return value; }
