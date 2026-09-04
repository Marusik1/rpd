import { useCallback, useState } from 'react';
import type { CatalogDocument } from '@rpd/shared';
import { readDocumentPreferences, reconcileDocumentPreferences, recordRecentPreference, toggleFavoritePreference, writeDocumentPreferences, type DocumentPreferences } from './document-preferences.js';

export function useDocumentPreferences(documents: readonly CatalogDocument[]) {
  const [preferences, setPreferences] = useState<DocumentPreferences>(() => reconcileDocumentPreferences(readDocumentPreferences(), documents));
  const update = useCallback((change: (current: DocumentPreferences) => DocumentPreferences) => {
    setPreferences((current) => { const next = reconcileDocumentPreferences(change(current), documents); writeDocumentPreferences(next); return next; });
  }, [documents]);
  return {
    favoriteIds: preferences.favoriteIds,
    recent: preferences.recent,
    toggleFavorite: useCallback((id: string) => update((current) => toggleFavoritePreference(current, id)), [update]),
    recordRecent: useCallback((id: string) => update((current) => recordRecentPreference(current, id)), [update]),
  };
}
