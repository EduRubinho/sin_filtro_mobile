import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { loadPhoto } from '../../services/albums';
import { ApiError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../ui/theme';

/** La descarga lleva Bearer; Image no hace solicitudes remotas ni almacena archivos privados. */
export function AlbumImage({ token, photoId, style, fit = 'cover' }: { token: string; photoId: string; style: StyleProp<ViewStyle>; fit?: 'cover' | 'contain' }) {
  const [attempt, setAttempt] = useState(0);
  return <Photo key={`${token}:${photoId}:${attempt}`} token={token} photoId={photoId} style={style} fit={fit} retry={() => setAttempt(value => value + 1)} />;
}
function Photo({ token, photoId, style, fit, retry }: { token: string; photoId: string; style: StyleProp<ViewStyle>; fit: 'cover' | 'contain'; retry: () => void }) {
  const { expireSession } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('No se pudo cargar');
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    void loadPhoto(token, photoId, controller.signal).then(value => {
      if (active) setUri(value);
    }).catch(error => {
      if (!active) return;
      if (error instanceof ApiError && error.code === 'UNAUTHORIZED') expireSession();
      setMessage(error instanceof ApiError ? error.message : 'No se pudo descargar');
      setStatus('error');
    }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [token, photoId, expireSession]);
  return <View style={[styles.frame, style]}>
    {uri && <Image source={{ uri }} resizeMode={fit} style={StyleSheet.absoluteFill} onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />}
    {status === 'loading' && <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color={colors.ink} /></View>}
    {status === 'error' && <Pressable accessibilityRole="button" accessibilityLabel="Reintentar carga de foto" style={styles.overlay} onPress={event => {
      event.stopPropagation(); retry();
    }}><Text style={styles.error}>{message}</Text><Text style={styles.retry}>Reintentar</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.softGreen },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 4 },
  error: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  retry: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 4 },
});
