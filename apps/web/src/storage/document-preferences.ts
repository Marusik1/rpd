import type { CatalogDocument } from '@rpd/shared';

export const DOCUMENT_PREFERENCES_KEY = 'rpd:document-preferences';
export const DOCUMENT_PREFERENCES_VERSION = 1;
export const MAX_RECENT_DOCUMENTS = 5;

export type RecentDocumentPreference = { id: string; openedAt: number };
export type DocumentPreferences = { version: 1; favoriteIds: string[]; recent: RecentDocumentPreference[] };

const emptyPreferences = (): DocumentPreferences => ({ version: DOCUMENT_PREFERENCES_VERSION, favoriteIds: [], recent: [] });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function parsePreferences(value: unknown): DocumentPreferences {
  if (!isRecord(value) || value.version !== DOCUMENT_PREFERENCES_VERSION || !Array.isArray(value.favoriteIds) || !Array.isArray(value.recent)) return emptyPreferences();
  const favoriteIds = [...new Set(value.favoriteIds.filter((id): id is string => typeof id === 'string'))];
  const recent: RecentDocumentPreference[] = [];
  const seen = new Set<string>();
  for (const item of value.recent) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.openedAt !== 'number' || !Number.isFinite(item.openedAt) || seen.has(item.id)) continue;
    seen.add(item.id);
    recent.push({ id: item.id, openedAt: item.openedAt });
  }
  recent.sort((left, right) => right.openedAt - left.openedAt);
  return { version: DOCUMENT_PREFERENCES_VERSION, favoriteIds, recent: recent.slice(0, MAX_RECENT_DOCUMENTS) };
}

export function readDocumentPreferences(storage?: Pick<Storage, 'getItem'> | null): DocumentPreferences {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const raw = target?.getItem(DOCUMENT_PREFERENCES_KEY);
    return raw === null || raw === undefined ? emptyPreferences() : parsePreferences(JSON.parse(raw));
  } catch { return emptyPreferences(); }
}

export function writeDocumentPreferences(preferences: DocumentPreferences, storage?: Pick<Storage, 'setItem'> | null): boolean {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    target?.setItem(DOCUMENT_PREFERENCES_KEY, JSON.stringify(preferences));
    return target !== null;
  } catch { return false; }
}

export function reconcileDocumentPreferences(preferences: DocumentPreferences, documents: readonly Pick<CatalogDocument, 'id'>[]): DocumentPreferences {
  const catalogIds = new Set(documents.map(({ id }) => id));
  return { version: DOCUMENT_PREFERENCES_VERSION, favoriteIds: preferences.favoriteIds.filter((id) => catalogIds.has(id)), recent: preferences.recent.filter(({ id }) => catalogIds.has(id)).slice(0, MAX_RECENT_DOCUMENTS) };
}

export function toggleFavoritePreference(preferences: DocumentPreferences, id: string): DocumentPreferences {
  return { ...preferences, favoriteIds: preferences.favoriteIds.includes(id) ? preferences.favoriteIds.filter((favoriteId) => favoriteId !== id) : [...preferences.favoriteIds, id] };
}

export function recordRecentPreference(preferences: DocumentPreferences, id: string, openedAt = Date.now()): DocumentPreferences {
  return { ...preferences, recent: [{ id, openedAt }, ...preferences.recent.filter((item) => item.id !== id)].slice(0, MAX_RECENT_DOCUMENTS) };
}
