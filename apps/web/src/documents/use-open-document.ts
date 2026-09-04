import { useCallback, useState } from 'react';
import { buildDocumentUrl, type CatalogDocument } from '@rpd/shared';
import { useTelegram } from '../telegram/telegram-provider.js';
import { useDocumentAvailability } from './use-document-availability.js';

export function useOpenDocument(document: CatalogDocument) {
  const telegram = useTelegram(); const availability = useDocumentAvailability(); const [verifiedUrl, setVerifiedUrl] = useState<string | null>(null);
  const open = useCallback(async () => {
    setVerifiedUrl(null); availability.retry();
    const siteBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    const url = buildDocumentUrl({ siteBaseUrl, relativeDocumentPath: document.path });
    if (!(await availability.check(url))) return;
    if (!telegram.openLink(url.href)) setVerifiedUrl(url.href);
  }, [availability, document.path, telegram]);
  return { status: availability.status, open, verifiedUrl };
}
