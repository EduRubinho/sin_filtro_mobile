import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import * as auth from '../services/auth';
import { ApiError } from '../services/api';
import type { Credentials, Session, ProfileInput } from '../types/auth';

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

/** Una única sesión compartida entre el login y las rutas protegidas. */
export function AuthProvider({ children }: PropsWithChildren) {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}

function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  const expire = useCallback(() => {
    setSession(null);
    setError('Tu sesión terminó. Inicia sesión otra vez.');
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(expire, Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (Date.parse(session.expiresAt) <= Date.now()) { expire(); return; }
      // Refresca rol/perfil cuando la app vuelve al primer plano.
      void auth.getCurrentUser(session.token).then(user => {
        setSession(current => current?.token === session.token ? { ...current, user } : current);
      }).catch(error => {
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
          setSession(current => current?.token === session.token ? null : current);
        }
      });
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session, expire]);

  async function run(action: () => Promise<void>) {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') setSession(null);
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la operación.');
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    session,
    busy,
    error,
    login: (credentials: Credentials) => run(async () => {
      setSession(await auth.login(credentials));
    }),
    register: (credentials: Credentials) => run(async () => {
      setSession(await auth.register(credentials));
    }),
    saveProfile: (profile: ProfileInput) => run(async () => {
      if (!session) throw new ApiError('UNAUTHORIZED', 'Inicia sesión para guardar tu perfil.');
      const user = await auth.updateProfile(session.token, profile);
      setSession(current => current?.token === session.token ? { ...current, user } : current);
    }),
    checkSession: () => run(async () => {
      if (!session) return;
      const user = await auth.getCurrentUser(session.token);
      setSession(current => current?.token === session.token ? { ...current, user } : current);
    }),
    logout: () => run(async () => {
      if (!session) return;
      // Si falla la red conservamos la sesión y permitimos reintentar su revocación.
      await auth.logout(session.token);
      setSession(null);
    }),
  };
}
