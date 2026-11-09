import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { cancelActivity, getMyPlans, leaveActivity } from '../../services/activities';
import { ApiError } from '../../services/api';
import type { UserPlan, UserPlans, UserPlanStatus } from '../../types/activity';
import { BrandMark } from '../ui/BrandMark';
import { colors, shadow } from '../ui/theme';

const activityImage = require('../../../assets/activity-volleyball.png');
const emptyPlans: UserPlans = { organized: [], participating: [] };
type Scope = 'organized' | 'participating';
type Filter = 'published' | 'completed' | 'cancelled';

export function PlansScreen() {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [plans, setPlans] = useState<UserPlans>(emptyPlans);
  const [scope, setScope] = useState<Scope>('organized');
  const [filter, setFilter] = useState<Filter>('published');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try { setPlans(await getMyPlans(token)); }
    catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar tus planes.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [expireSession, token]);

  useFocusEffect(useCallback(() => { setClock(Date.now()); void load(); }, [load]));

  const source = scope === 'organized' ? plans.organized : plans.participating;
  const visible = useMemo(() => source.filter(plan => plan.status === filter), [filter, source]);

  async function perform(plan: UserPlan, action: 'leave' | 'cancel') {
    if (actingId) return;
    setActingId(plan.id); setError(null);
    try {
      if (action === 'leave') await leaveActivity(token, plan.id);
      else await cancelActivity(token, plan.id);
      await load(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación.');
    } finally { setActingId(null); }
  }

  function confirm(plan: UserPlan, action: 'leave' | 'cancel') {
    const leaving = action === 'leave';
    Alert.alert(leaving ? 'Retirarte de la actividad' : 'Cancelar actividad', leaving
      ? 'Tu plaza volverá a quedar disponible.'
      : 'Los participantes podrán ver que la actividad fue cancelada, pero ya no podrán unirse.', [
      { text: 'Volver', style: 'cancel' },
      { text: leaving ? 'Retirarme' : 'Cancelar actividad', style: 'destructive', onPress: () => { void perform(plan, action); } },
    ]);
  }

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <BrandMark compact />
      <Text accessibilityRole="header" style={styles.title}>Mis planes</Text>
      <Text style={styles.subtitle}>Organiza tus próximas actividades y revisa aquellas a las que te uniste.</Text>
      <View style={styles.scopeTabs}>
        <ScopeTab title={`Organizo (${plans.organized.length})`} active={scope === 'organized'} onPress={() => setScope('organized')} />
        <ScopeTab title={`Participo (${plans.participating.length})`} active={scope === 'participating'} onPress={() => setScope('participating')} />
      </View>
      <View style={styles.filters}>
        <FilterButton title="Próximas" active={filter === 'published'} onPress={() => setFilter('published')} />
        <FilterButton title="Finalizadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        <FilterButton title="Canceladas" active={filter === 'cancelled'} onPress={() => setFilter('cancelled')} />
      </View>
    </View>

    {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
    <FlatList data={loading ? [] : visible} keyExtractor={plan => `${plan.relation}-${plan.id}`}
      contentContainerStyle={[styles.list, !visible.length && styles.emptyList]} refreshing={refreshing} onRefresh={() => { void load(true); }}
      ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator color={colors.ink} /><Text style={styles.emptyText}>Cargando tus planes…</Text></View>
        : <View style={styles.center}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>□</Text></View><Text style={styles.emptyTitle}>No hay actividades aquí</Text><Text style={styles.emptyText}>{emptyMessage(scope, filter)}</Text>{filter === 'published' && scope === 'organized' && <Pressable accessibilityRole="button" onPress={() => router.push('/publish')} style={styles.primary}><Text style={styles.primaryText}>＋ Crear actividad</Text></Pressable>}</View>}
      renderItem={({ item }) => <PlanCard plan={item} now={clock} busy={actingId === item.id} onOpen={() => router.push(`/activity/${item.id}`)}
        onChat={() => router.push(`/activity/${item.id}/chat`)} onEdit={() => router.push(`/activity/${item.id}/edit`)} onLeave={() => confirm(item, 'leave')} onCancel={() => confirm(item, 'cancel')} />}
    />
  </SafeAreaView>;
}

function ScopeTab({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.scopeTab, active && styles.scopeTabActive]}><Text style={[styles.scopeText, active && styles.scopeTextActive]}>{title}</Text></Pressable>;
}

function FilterButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text></Pressable>;
}

function PlanCard({ plan, now, busy, onOpen, onChat, onEdit, onLeave, onCancel }: { plan: UserPlan; now: number; busy: boolean; onOpen: () => void; onChat: () => void; onEdit: () => void; onLeave: () => void; onCancel: () => void }) {
  const published = plan.status === 'published';
  const status = published ? Date.parse(plan.startsAt) <= now ? 'En curso' : 'Próxima' : plan.status === 'completed' ? 'Finalizada' : 'Cancelada';
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${plan.title}`} onPress={onOpen} style={styles.cardMain}>
      <Image source={activityImage} style={styles.image} resizeMode="cover" />
      <View style={styles.info}>
        <View style={styles.cardTop}><Text style={styles.category}>{plan.categoryName}</Text><View style={[styles.statusBadge, plan.status === 'cancelled' && styles.cancelledBadge]}><Text style={styles.statusText}>{status}</Text></View></View>
        <Text numberOfLines={2} style={styles.cardTitle}>{plan.title}</Text>
        <Text numberOfLines={1} style={styles.meta}>◷ {formatDate(plan.startsAt)}</Text>
        <Text numberOfLines={1} style={styles.meta}>⌖ {plan.locationName}</Text>
        <Text style={styles.people}>○ {plan.participantCount}{plan.capacity === null ? '' : `/${plan.capacity}`} participantes</Text>
      </View>
    </Pressable>
    <View style={styles.actions}>
      <Action title="Ver detalle" disabled={busy} onPress={onOpen} />
      {plan.chatAvailable && <Action title={plan.unreadCount ? `Chat (${plan.unreadCount})` : plan.chatReadOnly ? 'Ver chat' : 'Chat'} disabled={busy} onPress={onChat} />}
      {published && plan.relation === 'organizer' && <Action title="Editar" disabled={busy} onPress={onEdit} />}
      {published && <Action title={busy ? 'Procesando…' : plan.relation === 'organizer' ? 'Cancelar' : 'Retirarme'} danger disabled={busy} onPress={plan.relation === 'organizer' ? onCancel : onLeave} />}
    </View>
  </View>;
}

function Action({ title, onPress, disabled, danger = false }: { title: string; onPress: () => void; disabled: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, danger && styles.dangerAction, disabled && styles.disabled]}><Text style={[styles.actionText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function emptyMessage(scope: Scope, status: UserPlanStatus) {
  if (status === 'published') return scope === 'organized' ? 'Crea una actividad y aparecerá en esta sección.' : 'Cuando te unas a una actividad aparecerá aquí.';
  if (status === 'completed') return 'Tus actividades finalizadas aparecerán aquí.';
  return 'No tienes actividades canceladas en esta sección.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  scopeTabs: { flexDirection: 'row', backgroundColor: '#EAE8E1', borderRadius: 16, padding: 4, marginTop: 18 }, scopeTab: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 13 }, scopeTabActive: { backgroundColor: colors.ink }, scopeText: { color: colors.muted, fontWeight: '800', fontSize: 13 }, scopeTextActive: { color: '#FFFFFF' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 }, filter: { flex: 1, minHeight: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: colors.softCoral, borderColor: '#F1B5A7' }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: colors.coral, fontWeight: '900' },
  list: { paddingHorizontal: 20, paddingBottom: 28 }, emptyList: { flexGrow: 1 }, errorBox: { marginHorizontal: 20, marginBottom: 8, borderRadius: 14, padding: 11, backgroundColor: '#FFF0ED' }, error: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 28 }, emptyIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.softCoral, alignItems: 'center', justifyContent: 'center' }, emptyIconText: { color: colors.coral, fontSize: 35, fontWeight: '800' }, emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 17 }, emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  primary: { minHeight: 50, borderRadius: 25, backgroundColor: colors.ink, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, primaryText: { color: '#FFFFFF', fontWeight: '900' },
  card: { backgroundColor: colors.surface, borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E9E5DC', ...shadow }, cardMain: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 13 }, image: { width: 104, height: 128, borderRadius: 16, backgroundColor: colors.softGreen }, info: { flex: 1 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, category: { flex: 1, color: colors.coral, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, statusBadge: { borderRadius: 12, backgroundColor: colors.softGreen, paddingHorizontal: 8, paddingVertical: 4 }, cancelledBadge: { backgroundColor: colors.softCoral }, statusText: { color: colors.ink, fontSize: 10, fontWeight: '900' }, cardTitle: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900', marginTop: 6, marginBottom: 5 }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, people: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 12, paddingBottom: 12 }, action: { flexGrow: 1, flexBasis: '30%', minHeight: 40, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' }, actionText: { color: colors.ink, fontSize: 11, fontWeight: '900', textAlign: 'center' }, dangerAction: { backgroundColor: colors.softCoral }, dangerText: { color: colors.danger }, disabled: { opacity: 0.5 },
});
