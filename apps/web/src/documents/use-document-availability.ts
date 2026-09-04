import { useCallback, useRef, useState } from 'react';
export type AvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable';
export function useDocumentAvailability() {
  const [status, setStatus] = useState<AvailabilityState>('idle'); const pending = useRef(false);
  const check = useCallback(async (url: URL): Promise<boolean> => {
    if (pending.current) return false; pending.current = true; setStatus('checking');
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 5_000);
    try { const response = await fetch(url, { method: 'HEAD', signal: controller.signal, credentials: 'same-origin' }); const available = response.ok; setStatus(available ? 'available' : 'unavailable'); return available; }
    catch { setStatus('unavailable'); return false; }
    finally { window.clearTimeout(timeout); pending.current = false; }
  }, []);
  return { status, check, retry: () => setStatus('idle') };
}
