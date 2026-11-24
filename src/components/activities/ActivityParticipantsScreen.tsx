import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { getActivity } from '../../services/activities';
import { getAttendance } from '../../services/attendance';
import { ApiError } from '../../services/api';
import type { ActivityDetail } from '../../types/event';
import type { AttendanceInfo } from '../../types/attendance';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { colors } from '../ui/theme';

type Filter = 'all' | 'confirmed' | 'pending';
const filters: [Filter, string][] = [['all', 'Todos'], ['confirmed', 'Confirmados'], ['pending', 'Pendientes']];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** La asistencia solo se consulta para inscritos; la lista se virtualiza para no montar todas las filas. */
export function ActivityParticipantsScreen({ activityId }: { activityId: string }) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceInfo | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(''); setActivity(null); setAttendance(null);
    void (async () => {
      try {
        const detail = await getActivity(token, activityId);
        if (!active) return;
        setActivity(detail);
        if (detail.viewer.isOrganizer || detail.viewer.isJoined) {
          const info = await getAttendance(token, activityId);
          if (active) setAttendance(info);
        }
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
        setError(caught instanceof Error ? caught.message : 'No se pudo cargar la lista.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  // attempt fuerza una nueva consulta al reintentar o deslizar para actualizar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, token, expireSession, attempt]));

  const people = attendance ? attendance.participants : (activity?.participants ?? []).map(p => ({ ...p, validatedAt: null }));
  const visible = people.filter(person => normalize(person.displayName).includes(normalize(query)) &&
    (!attendance || filter === 'all' || (filter === 'confirmed' ? !!person.validatedAt : !person.validatedAt)));

  return <SafeAreaView style={s.screen}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver al detalle" onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹</Text></Pressable><BrandMark compact /></View>
    <FlatList data={visible} keyExtractor={person => person.id} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"
      refreshing={loading} onRefresh={() => setAttempt(v => v + 1)}
      ListHeaderComponent={<>
        <Text accessibilityRole="header" style={s.title}>Participantes ({attendance?.enrolled ?? activity?.participantCount ?? 0})</Text>
        <Text style={s.note}>{activity?.title}</Text>
        {attendance && <Text style={s.summary}>{attendance.enrolled} inscritos · {attendance.confirmed} confirmados · {attendance.pending} pendientes</Text>}
        <TextInput accessibilityLabel="Buscar participante" placeholder="Buscar participante" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={s.search} autoCorrect={false} />
        {attendance && <View style={s.filters}>{filters.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.chip, filter === value && s.chipActive]}><Text style={[s.chipText, filter === value && s.chipTextActive]}>{label}</Text></Pressable>)}</View>}
        {activity && <View style={s.person}><View style={s.avatar}><Text style={s.initial}>{activity.organizer.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={s.copy}><Text style={s.name}>{activity.organizer.displayName}</Text><Text style={s.organizer}>Organizador · No ocupa cupo</Text></View></View>}
        {!loading && !attendance && !error && <Text style={s.note}>Los estados de asistencia están disponibles para el organizador y los inscritos.</Text>}
        {!!error && <View style={s.feedback}><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Reintentar" onPress={() => setAttempt(v => v + 1)} /></View>}
      </>}
      renderItem={({ item }) => <View style={s.person}>
        <View style={s.avatar}><Text style={s.initial}>{item.displayName.slice(0, 1).toUpperCase()}</Text></View>
        <View style={s.copy}><Text style={s.name}>{item.displayName}</Text>
          {attendance && <Text style={[s.badge, item.validatedAt ? s.confirmed : s.pending]}>{item.validatedAt ? 'Asistencia confirmada' : 'Pendiente'}</Text>}
        </View>
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.ink} style={s.feedback} /> : !error ? <Text style={s.empty}>{people.length ? 'No hay participantes con estos filtros.' : 'Todavía no hay participantes.'}</Text> : undefined}
    />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 8 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, backText: { fontSize: 36, color: colors.ink },
  content: { padding: 24, paddingBottom: 40 }, title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginBottom: 8 }, note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  summary: { color: colors.ink, fontWeight: '700', lineHeight: 21, marginTop: 12 }, search: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, color: colors.text, marginVertical: 16, minHeight: 48 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, chip: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, chipActive: { backgroundColor: colors.ink, borderColor: colors.ink }, chipText: { color: colors.ink, fontWeight: '700' }, chipTextActive: { color: colors.surface },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.ink, fontWeight: '800', fontSize: 18 }, copy: { flex: 1, gap: 5 }, name: { color: colors.text, fontWeight: '800', fontSize: 16 }, organizer: { color: colors.coral, fontSize: 12, fontWeight: '700' }, badge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 }, confirmed: { color: colors.ink, backgroundColor: colors.softGreen }, pending: { color: colors.muted, backgroundColor: colors.surface }, empty: { textAlign: 'center', color: colors.muted, paddingVertical: 28 }, feedback: { marginVertical: 16, gap: 10 }, error: { color: colors.danger },
});
