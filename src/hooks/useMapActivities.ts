import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './useAuth';
import { getMapActivities } from '../services/activities';
import { ApiError } from '../services/api';
import type { MapActivities } from '../types/activity';

const empty: MapActivities = { activities: [], hasMore: false };
/** Conserva los marcadores visibles mientras renueva los resultados del centro solicitado. */
export function useMapActivities(latitude: number, longitude: number) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [revision, setRevision] = useState(0);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<{ data: MapActivities; error: string | null; loading: boolean }>({ data: empty, error: null, loading: true });
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useFocusEffect(useCallback(() => {
    setFocused(true); refresh();
    return () => setFocused(false);
  }, [refresh]));
  useEffect(() => {
    if (!focused) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) setState(current => ({ ...current, loading: true, error: null }));
      void getMapActivities(token, latitude, longitude).then(data => {
        if (active) setState({ data, error: null, loading: false });
      }).catch(error => {
        if (!active) return;
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') expireSession();
        setState(current => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'No se pudieron cargar las actividades.' }));
      });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [focused, token, latitude, longitude, revision, expireSession]);
  useEffect(() => {
    if (!focused) return;
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [focused, refresh]);
  return { ...state.data, loading: state.loading, error: state.error, refresh };
}
