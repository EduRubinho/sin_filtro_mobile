import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../services/api';
import { useAuth } from './useAuth';

/** Bloquea dobles envíos y conserva los errores de negocio del backend. */
export function useAdminTask() {
  const { expireSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const fail = useCallback((caught: unknown) => {
    if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
    setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación.');
  }, [expireSession]);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await action(); } catch (caught) { fail(caught); }
    finally { locked.current = false; setBusy(false); }
  }
  return { busy, error, fail, run, clearError: () => setError(null) };
}
