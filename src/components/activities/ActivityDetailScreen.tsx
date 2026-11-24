import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { cancelActivity, getActivity, joinActivity, leaveActivity } from '../../services/activities';
import { ApiError } from '../../services/api';
import type { ActivityDetail } from '../../types/event';
import { Button } from '../ui/Button';
import { colors, shadow } from '../ui/theme';
import { AttendancePanel } from './AttendancePanel';

const activityImage = require('../../../assets/activity-volleyball.png');
const statusLabels = { draft: 'Borrador', published: 'Publicada', cancelled: 'Cancelada', completed: 'Finalizada' } as const;

export function ActivityDetailScreen({ activityId }: { activityId: string }) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setActivity(await getActivity(token, activityId)); }
    catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar la actividad.');
    } finally { setLoading(false); }
  }, [activityId, expireSession, token]);

  useFocusEffect(useCallback(() => {
    void load(); setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [load]));

  async function mutate(action: () => Promise<ActivityDetail>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { setActivity(await action()); }
    catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación.');
    } finally { setBusy(false); }
  }

  if (loading && !activity) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.ink} /><Text style={styles.loadingText}>Cargando actividad…</Text></SafeAreaView>;
  if (!activity) return <SafeAreaView style={styles.center}><Text style={styles.error}>{error || 'Actividad no disponible.'}</Text><Button title="Reintentar" onPress={() => { void load(); }} /><Button title="Volver al mapa" variant="secondary" onPress={() => router.back()} /></SafeAreaView>;

  const open = activity.status === 'published' && Date.parse(activity.endsAt) > now;
  const full = activity.availableSpots === 0;
  // Ambas fechas usan la zona del evento, no la configuración del teléfono.
  const scheduleFormatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: activity.timeZone, day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={activityImage} style={styles.heroImage} resizeMode="cover" />
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.status}><Text style={styles.statusText}>{activity.status === 'published' ? (!open ? 'Finalizada' : Date.parse(activity.startsAt) <= now ? 'En curso' : 'Próxima') : statusLabels[activity.status]}</Text></View>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.category}>{activity.categoryName}</Text>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>{activity.title}</Text>
          {open && (activity.viewer.isOrganizer || activity.viewer.isJoined) && <Pressable
            accessibilityRole="button" accessibilityLabel="Abrir chat de la actividad"
            onPress={() => router.push(`/activity/${activity.id}/chat`)}
            style={({ pressed }) => [styles.chatButton, pressed && { opacity: 0.65 }]}>
            <View accessible={false} style={styles.chatBubble}>
              <View style={styles.chatDots}>{[0, 1, 2].map(dot => <View key={dot} style={styles.chatDot} />)}</View>
              <View style={styles.chatTail} />
            </View>
          </Pressable>}
        </View>
        <View style={styles.privacy}><Text style={styles.privacyLabel}>{activity.albumVisibility === 'private'? 'Álbum privado': 'Álbum público'}</Text></View>
        <View style={styles.fact}>
          <Text style={styles.factIcon}>◷</Text>
          <View style={styles.schedule}>
            <View>
              <Text style={styles.secondary}>Inicio</Text>
              <Text style={styles.scheduleValue}>{scheduleFormatter.format(new Date(activity.startsAt))}</Text>
            </View>
            <View>
              <Text style={styles.secondary}>Fin</Text>
              <Text style={styles.scheduleValue}>{scheduleFormatter.format(new Date(activity.endsAt))}</Text>
            </View>
          </View>
        </View>
        <View style={styles.fact}><Text style={styles.factIcon}>⌖</Text><View style={{ flex: 1 }}><Text style={styles.factText}>{activity.locationName}</Text>{activity.address && <Text style={styles.secondary}>{activity.address}</Text>}{activity.meetingDetails && <Text style={styles.secondary}>Encuentro: {activity.meetingDetails}</Text>}</View></View>
        <View style={styles.fact}><Text style={styles.factIcon}>○</Text><Text style={styles.factText}>Organiza {activity.organizer.displayName}</Text></View>


        <View style={styles.summaryRow}>
          <View style={styles.summary}><Text style={styles.summaryValue}>{activity.price === 0 ? 'Gratis' : `${activity.currency} ${activity.price.toFixed(2)}`}</Text><Text style={styles.summaryLabel}>Precio</Text></View>
          <View style={styles.summary}><Text style={styles.summaryValue}>{activity.capacity === null ? 'Sin límite' : `${activity.participantCount}/${activity.capacity}`}</Text><Text style={styles.summaryLabel}>Participantes</Text></View>
        </View>

      
        <View style={styles.section}><Text style={styles.sectionTitle}>Acerca de la actividad</Text><Text style={styles.description}>{activity.description || 'El organizador todavía no agregó una descripción.'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver los ${activity.participantCount} participantes`}
          onPress={() => router.push(`/activity/${activity.id}/participants`)} style={styles.participantsCard}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Participantes · {activity.participantCount}</Text><Text style={styles.seeAll}>Ver todos ›</Text></View>
          <View style={styles.avatarRow}>
            {activity.participants.slice(0, 4).map(person => <View key={person.id} style={styles.personAvatar}><Text style={styles.personInitial}>{person.displayName.slice(0, 1).toUpperCase()}</Text></View>)}
            {activity.participantCount > 4 && <View style={styles.personAvatar}><Text style={styles.personInitial}>+{activity.participantCount - 4}</Text></View>}
            {!activity.participantCount && <Text style={styles.secondary}>Sé el primero en unirte.</Text>}
          </View>
        </Pressable>

        {activity.album.canView && <Button title="Ver álbum de recuerdos" onPress={() => router.push(`/album/${activity.id}`)} />}
        {(activity.viewer.isOrganizer || activity.viewer.isJoined) && <AttendancePanel key={activity.id} activityId={activity.id} />}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {activity.viewer.isOrganizer ? <View style={styles.actions}>
          <View style={styles.ownerNotice}><Text style={styles.ownerText}>Esta actividad fue publicada por ti.</Text></View>
          {open && <Button title="Editar actividad" disabled={busy} onPress={() => router.push(`/activity/${activity.id}/edit`)} />}
          {open && <Button title={busy ? 'Cancelando…' : 'Cancelar actividad'} disabled={busy} variant="secondary" onPress={() => Alert.alert('Cancelar actividad', 'Los participantes seguirán viendo el detalle, pero nadie podrá unirse.', [
            { text: 'Volver', style: 'cancel' },
            { text: 'Cancelar actividad', style: 'destructive', onPress: () => { void mutate(() => cancelActivity(token, activity.id)); } },
          ])} />}
        </View> : activity.viewer.isJoined ? <Button title={busy ? 'Procesando…' : 'Retirarme de la actividad'} disabled={busy} variant="secondary" onPress={() => Alert.alert('Retirarte', 'Tu plaza volverá a quedar disponible.', [
          { text: 'Volver', style: 'cancel' },
          { text: 'Retirarme', style: 'destructive', onPress: () => { void mutate(() => leaveActivity(token, activity.id)); } },
        ])} /> : <Button title={busy ? 'Uniéndote…' : full ? 'Actividad sin cupos' : open ? 'Unirme a la actividad' : `Actividad ${statusLabels[activity.status].toLowerCase()}`}
          disabled={busy || full || !open} onPress={() => { void mutate(() => joinActivity(token, activity.id)); }} />}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  content: { paddingBottom: 32 }, loadingText: { color: colors.muted }, error: { color: colors.danger, textAlign: 'center', marginVertical: 12, lineHeight: 20 },
  hero: { height: 220, backgroundColor: colors.softGreen }, heroImage: { width: '100%', height: '100%' },
  back: { position: 'absolute', top: 16, left: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFFEC', alignItems: 'center', justifyContent: 'center', ...shadow },
  backText: { color: colors.ink, fontSize: 38, lineHeight: 39, marginTop: -4 }, status: { position: 'absolute', top: 22, right: 18, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFFFFFEC' },
  statusText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, sheet: { marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.background, padding: 24 },
  category: { color: colors.coral, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 5, marginBottom: 18 },
  chatButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  chatBubble: { width: 25, height: 20, borderWidth: 2, borderColor: colors.ink, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  chatDots: { flexDirection: 'row', gap: 3 }, chatDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.ink },
  chatTail: { position: 'absolute', bottom: -5, left: 4, width: 7, height: 7, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.ink, backgroundColor: colors.softGreen, transform: [{ skewY: '-35deg' }] },
  title: { flex: 1, color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900' },
  schedule: { flex: 1, gap: 8 },
  scheduleValue: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  fact: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 13 }, factIcon: { width: 22, color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center' }, factText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 21 }, secondary: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 8 }, summary: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border }, summaryValue: { color: colors.ink, fontSize: 18, fontWeight: '900' }, summaryLabel: { color: colors.muted, fontSize: 12, marginTop: 3 },
  privacy: { gap: 5, marginBottom: 18 }, privacyLabel: { alignSelf: 'flex-start', color: colors.ink, backgroundColor: colors.softGreen, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, fontWeight: '700' },
  participantsCard: { marginTop: 22, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  avatarRow: { flexDirection: 'row', gap: 8 }, seeAll: { color: colors.coral, fontWeight: '700', marginLeft: 'auto', marginBottom: 10 },
  section: { marginTop: 22 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 }, count: { color: colors.coral, fontWeight: '900', marginBottom: 10 }, description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 9 }, personAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.softCoral, alignItems: 'center', justifyContent: 'center' }, personInitial: { color: colors.coral, fontWeight: '900' }, personName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  actions: { marginTop: 10 }, ownerNotice: { padding: 14, borderRadius: 15, backgroundColor: colors.softGreen, marginTop: 10 }, ownerText: { color: colors.ink, fontWeight: '700', textAlign: 'center' },
});
