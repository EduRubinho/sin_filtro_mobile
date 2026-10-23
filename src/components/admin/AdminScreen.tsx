import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAdminTask } from '../../hooks/useAdminTask';
import * as api from '../../services/admin';
import type { AdminUser } from '../../types/admin';
import type { EventRecord } from '../../types/event';
import { Button } from '../ui/Button';
import { Choice, Notice, Sheet, formatDate, labels, s } from '../ui/FormControls';
import { UserForm } from './UserForm';
import { EventForm } from './EventForm';
import { BrandMark } from '../ui/BrandMark';
import { colors } from '../ui/theme';

type Item = AdminUser | EventRecord;
type Panel = { kind: 'createUser' } | { kind: 'createEvent' } | { kind: 'detail'; item: Item } |
  { kind: 'editUser'; user: AdminUser } | { kind: 'editEvent'; event: EventRecord } | null;
const isUser = (item: Item): item is AdminUser => 'email' in item;

export function AdminScreen() {
  const { session, logout, busy: authBusy, error: authError } = useAuth();
  const token = session?.token ?? '';
  const [section, setSection] = useState<'users' | 'events'>('users');
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { busy, error, fail, clearError, run } = useAdminTask();
  useEffect(() => {
    let active = true;
    const request = section === 'users' ? api.listUsers(token, page * 20) : api.listEvents(token, page * 20);
    void request.then(values => { if (active) setItems(values); }).catch(error => {
      if (active) { setLoadFailed(true); fail(error); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section, page, attempt, token, fail]);
  const reload = () => { clearError(); setLoadFailed(false); setLoading(true); setAttempt(value => value + 1); };
  const changeSection = (value: typeof section) => {
    if (value === section) return;
    setSection(value); setPage(0); setNotice(null); reload();
  };
  const saved = () => { setPanel(null); setNotice('Cambios guardados.'); setPage(0); reload(); };
  const open = (item: Item) => run(async () => {
    const fresh = isUser(item) ? await api.getUser(token, item.id) : await api.getEvent(token, item.id);
    setPanel({ kind: 'detail', item: fresh });
  });
  const remove = (item: Item) => {
    Alert.alert(isUser(item) ? 'Eliminar usuario' : 'Eliminar evento', isUser(item)
      ? `¿Eliminar la cuenta ${item.email}? Es permanente. Si tiene relaciones con eventos, el backend impedirá eliminarla.`
      : `¿Eliminar «${item.title}»? Dejará de aparecer en el listado; sus relaciones se conservarán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void run(async () => {
        if (isUser(item)) await api.deleteUser(token, item.id); else await api.deleteEvent(token, item.id);
        setPanel(null); setNotice(isUser(item) ? 'Usuario eliminado.' : 'Evento eliminado.'); setPage(0); reload();
      }); } },
    ]);
  };
  const blocked = busy || authBusy;
  return <SafeAreaView style={s.screen}>
    <View style={s.header}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><BrandMark compact /><Choice label="Salir" disabled={blocked} onPress={() => { void logout(); }} /></View>
      <View style={{ marginTop: 12 }}><Text style={s.brand}>PANEL ADMINISTRATIVO</Text><Text accessibilityRole="header" style={s.title}>Administración</Text></View>
      <View style={adminStyles.session}><View style={adminStyles.adminDot}><Text style={adminStyles.adminInitial}>A</Text></View><View style={{ flex: 1 }}><Text style={adminStyles.sessionLabel}>Administrador</Text><Text style={s.meta} numberOfLines={1}>{session?.user.email}</Text></View></View>
      <View style={adminStyles.tabs}><Pressable accessibilityRole="button" disabled={blocked} onPress={() => changeSection('users')} style={[adminStyles.tab, section === 'users' && adminStyles.activeTab]}><Text style={[adminStyles.tabText, section === 'users' && adminStyles.activeTabText]}>Usuarios</Text></Pressable><Pressable accessibilityRole="button" disabled={blocked} onPress={() => changeSection('events')} style={[adminStyles.tab, section === 'events' && adminStyles.activeTab]}><Text style={[adminStyles.tabText, section === 'events' && adminStyles.activeTabText]}>Eventos</Text></Pressable></View>
    </View>
    <FlatList data={loading || loadFailed ? [] : items} keyExtractor={item => `${section}-${item.id}`} contentContainerStyle={{ padding: 20, paddingTop: 0, flexGrow: 1 }}
      refreshing={loading} onRefresh={() => { if (!blocked) reload(); }}
      ListHeaderComponent={<>
        <Text style={s.meta}>{section === 'users' ? 'Cuentas de usuarios. Los administradores no se muestran aquí.' : 'Gestiona los eventos de usuarios y consulta sus datos.'}</Text>
        <Button title={section === 'users' ? '+ Crear usuario' : '+ Crear evento'} disabled={blocked} onPress={() => { clearError(); setPanel({ kind: section === 'users' ? 'createUser' : 'createEvent' }); }} />
        {notice && <Notice text={notice} />}{authError && <Notice error text={authError} />}
        {!panel && error && <Notice error text={error} />}
        <View style={[s.row, { marginVertical: 14 }]}><Text style={s.meta}>Página {page + 1}</Text><Choice label="Actualizar" disabled={blocked || loading} onPress={reload} /></View>
        {busy && <ActivityIndicator color="#1E5547" accessibilityLabel="Procesando" />}
      </>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#1E5547" accessibilityLabel="Cargando registros" /> : loadFailed
        ? <Button title="Reintentar carga" variant="secondary" onPress={reload} disabled={blocked} />
        : <View style={s.card}><Text style={s.cardTitle}>Sin {section === 'users' ? 'usuarios' : 'eventos'} en esta página</Text><Notice text={section === 'users' ? 'Aquí aparecerán las cuentas registradas con rol de usuario.' : 'Aquí aparecerán los eventos creados. Por ahora puedes gestionarlos desde este panel.'} /></View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${isUser(item) ? item.email : item.title}`} disabled={blocked} onPress={() => { void open(item); }} style={s.card}>
        <Text style={s.badge}>#{item.id} · {labels[item.status]}</Text>
        <Text style={s.cardTitle}>{isUser(item) ? item.profile.displayName || 'Perfil pendiente' : item.title}</Text>
        <Text style={s.meta}>{isUser(item) ? item.email : item.locationName}</Text>
        <Text style={s.meta}>{isUser(item) ? item.profile.completed ? 'Perfil completo' : 'Pendiente de personalización' : formatDate(item.startsAt)}</Text>
        <Text style={s.badge}>Ver detalle →</Text>
      </Pressable>}
      ListFooterComponent={!loading && !loadFailed ? <View style={[s.row, { justifyContent: 'space-between', marginVertical: 12 }]}>
        <Choice label="Anterior" disabled={blocked || page === 0} onPress={() => { setPage(value => value - 1); reload(); }} />
        <Choice label="Siguiente" disabled={blocked || items.length < 20} onPress={() => { setPage(value => value + 1); reload(); }} />
      </View> : null} />
    {(panel?.kind === 'createUser' || panel?.kind === 'editUser') && <UserForm token={token} user={panel.kind === 'editUser' ? panel.user : undefined} onClose={() => setPanel(null)} onSaved={saved} />}
    {(panel?.kind === 'createEvent' || panel?.kind === 'editEvent') && <EventForm token={token} event={panel.kind === 'editEvent' ? panel.event : undefined} onClose={() => setPanel(null)} onSaved={saved} />}
    {panel?.kind === 'detail' && <Sheet title={isUser(panel.item) ? 'Detalle de usuario' : 'Detalle de evento'} busy={busy} onClose={() => { clearError(); setPanel(null); }}>
      <ItemDetails item={panel.item} />
      {error && <Notice error text={error} />}
      <Button title="Editar" disabled={busy} onPress={() => { clearError(); setPanel(isUser(panel.item) ? { kind: 'editUser', user: panel.item } : { kind: 'editEvent', event: panel.item }); }} />
      <Button title={busy ? 'Procesando…' : 'Eliminar'} disabled={busy} variant="secondary" onPress={() => remove(panel.item)} />
    </Sheet>}
  </SafeAreaView>;
}

const adminStyles = {
  session: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: '#E8E4DC', padding: 12, marginTop: 10 },
  adminDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EAF1EC', alignItems: 'center' as const, justifyContent: 'center' as const },
  adminInitial: { color: colors.ink, fontWeight: '900' as const }, sessionLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' as const },
  tabs: { flexDirection: 'row' as const, backgroundColor: '#ECEBE5', padding: 4, borderRadius: 16, marginTop: 12 },
  tab: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center' as const, justifyContent: 'center' as const }, activeTab: { backgroundColor: colors.ink },
  tabText: { color: colors.muted, fontWeight: '700' as const }, activeTabText: { color: '#FFFFFF' },
};
function ItemDetails({ item }: { item: Item }) {
  const entries: [string, string][] = isUser(item) ? [
    ['Correo', item.email], ['Nombre', item.profile.displayName || 'Sin completar'], ['Estado', labels[item.status]],
    ['Biografía', item.profile.bio || 'Sin biografía'], ['Intereses (IDs)', item.profile.interestIds.join(', ') || 'Sin seleccionar'],
    ['Perfil', item.profile.completed ? 'Completo' : 'Pendiente'], ['Registro', formatDate(item.createdAt)],
  ] : [
    ['Título', item.title], ['Estado', labels[item.status]], ['Organizador', `Usuario #${item.organizerId}`], ['Categoría', `#${item.categoryId}`],
    ['Descripción', item.description || 'Sin descripción'], ['Lugar', item.locationName], ['Dirección', item.address || 'Sin dirección'],
    ['Encuentro', item.meetingDetails || 'Sin indicaciones'], ['Coordenadas', `${item.latitude}, ${item.longitude}`],
    ['Inicio', formatDate(item.startsAt)], ['Fin', formatDate(item.endsAt)], ['Zona del evento', item.timeZone],
    ['Precio', item.price === 0 ? 'Gratis' : `${item.currency} ${item.price.toFixed(2)}`], ['Cupo', item.capacity === null ? 'Sin límite' : String(item.capacity)],
    ['Creación', formatDate(item.createdAt)], ['Última edición', formatDate(item.updatedAt)],
    ...(item.completedAt ? [['Finalizado', formatDate(item.completedAt)] as [string, string]] : []),
  ];
  return <><Text style={s.badge}>ID #{item.id}</Text>{entries.map(([label, value]) => <View key={label} style={{ marginTop: 16 }}><Text style={s.label}>{label}</Text><Text selectable style={s.meta}>{value}</Text></View>)}
    {!isUser(item) && <Notice text="Las fechas se muestran en la hora local de este dispositivo." />}</>;
}
