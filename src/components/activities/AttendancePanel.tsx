import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, AppState, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAttendance, issueAttendancePin, revokeAttendancePin, validateAttendance } from '../../services/attendance';
import { ApiError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { AttendanceInfo, IssuedPin } from '../../types/attendance';
import { Button } from '../ui/Button';
import { colors } from '../ui/theme';

const time = (value: string) => new Date(value).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** El servidor decide horarios/permisos. El PIN en claro solo vive en esta pantalla. */
export function AttendancePanel({ activityId }: { activityId: string }) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [info, setInfo] = useState<AttendanceInfo | null>(null);
  const [issued, setIssued] = useState<IssuedPin | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const active = useRef(false);
  const failure = useCallback((caught: unknown) => {
    if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
    if (active.current) setError(caught instanceof Error ? caught.message : 'No se pudo consultar la asistencia.');
  }, [expireSession]);
  const refresh = useCallback(async () => {
    const next = await getAttendance(token, activityId);
    if (!active.current) return;
    setInfo(next);
    setIssued(current => current && next.open && next.codeExpiresAt === current.expiresAt ? current : null);
  }, [activityId, token]);

  useFocusEffect(useCallback(() => {
    active.current = true;
    void refresh().catch(failure);
    const timer = setInterval(() => { if (AppState.currentState === 'active' && !locked.current) void refresh().catch(failure); }, 15_000);
    const subscription = AppState.addEventListener('change', state => {
      setIssued(null); setPin('');
      if (state === 'active') void refresh().catch(failure);
    });
    return () => { active.current = false; clearInterval(timer); subscription.remove(); setIssued(null); setPin(''); };
  }, [failure, refresh]));

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await action(); } catch (caught) { failure(caught); }
    finally {
      try { await refresh(); } catch (caught) { failure(caught); }
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>Asistencia</Text>
    {!info && !error && <ActivityIndicator color={colors.ink} />}
    {info && <>
      <Text style={styles.summary}>{info.enrolled} inscritos · {info.confirmed} confirmados · {info.pending} pendientes</Text>
      {info.isOrganizer ? <>
        {issued && info.open && <View style={styles.pinBox}>
          <Text style={styles.note}>Comparte este PIN presencialmente</Text>
          <Text selectable accessibilityLabel={`PIN ${issued.pin.split('').join(' ')}`} style={styles.pin}>{issued.pin}</Text>
          <Text style={styles.note}>Vence: {time(issued.expiresAt)}</Text>
        </View>}
        {!issued && info.codeExpiresAt && <Text style={styles.note}>Existe un PIN vigente hasta {time(info.codeExpiresAt)}. Por seguridad no puede recuperarse; puedes regenerarlo.</Text>}
        {info.open && <Button title={busy ? 'Procesando…' : info.codeExpiresAt ? 'Regenerar PIN' : 'Generar PIN'} disabled={busy} onPress={() => { void run(async () => {
          const next = await issueAttendancePin(token, activityId);
          if (active.current) setIssued(next);
        }); }} />}
        {info.codeExpiresAt && <Button title="Revocar PIN" variant="secondary" disabled={busy} onPress={() => { void run(async () => {
          await revokeAttendancePin(token, activityId); if (active.current) setIssued(null);
        }); }} />}

      </> : null}
      {info.validatedAt ? <Text style={styles.confirmed}>Asistencia confirmada · {time(info.validatedAt)}</Text> : <>
        {info.lockedUntil && <Text style={styles.error}>Intentos bloqueados hasta {time(info.lockedUntil)}.</Text>}
        {info.open && <>
          <Text style={styles.note}>{info.isOrganizer ? 'Confirma tu propia asistencia ingresando el PIN vigente. Es una declaración personal y no ocupa cupo.' : 'Pide el PIN al organizador durante el encuentro.'}</Text>
          <TextInput accessibilityLabel="PIN de asistencia de seis dígitos" placeholder="000000" value={pin}
            onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} maxLength={6} keyboardType="number-pad"
            editable={!busy && !info.lockedUntil} style={styles.input} />
          <Button title={busy ? 'Validando…' : 'Validar asistencia'} disabled={busy || !!info.lockedUntil || pin.length !== 6}
            onPress={() => { void run(async () => { await validateAttendance(token, activityId, pin); if (active.current) setPin(''); }); }} />
        </>}
      </>}
    </>}
    {error && <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Actualizar asistencia" variant="secondary" disabled={busy} onPress={() => { void run(async () => {}); }} /></>}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 8 }, title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  summary: { color: colors.ink, fontWeight: '700' }, note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  pinBox: { padding: 16, backgroundColor: colors.softGreen, borderRadius: 16, alignItems: 'center' },
  pin: { fontSize: 36, letterSpacing: 5, fontWeight: '800', color: colors.ink, marginVertical: 8 },
  input: { backgroundColor: colors.surface, color: colors.ink, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 6 },
  person: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, name: { color: colors.text, fontWeight: '700' },
  confirmed: { color: colors.ink, padding: 14, backgroundColor: colors.softGreen, borderRadius: 12 }, error: { color: colors.danger, lineHeight: 20 },
});
