import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { EventRecord, EventStatus } from '../../types/event';
import type { Category } from '../../types/auth';
import { createEvent, editEvent } from '../../services/admin';
import { getCategories } from '../../services/auth';
import { eventChanges, eventDraft, eventPayload } from '../../utils/eventForm';
import { useAdminTask } from '../../hooks/useAdminTask';
import { Button } from '../ui/Button';
import { Choice, Field, Notice, Sheet, labels, s } from '../ui/FormControls';
import { OrganizerPicker } from './OrganizerPicker';
import { LocationPicker } from '../ui/LocationPicker';
import { DateTimeField } from '../ui/DateTimeField';

export function EventForm({ token, event, onClose, onSaved }: { token: string; event?: EventRecord; onClose: () => void; onSaved: () => void }) {
  const [now] = useState(() => Date.now());
  const [draft, setDraft] = useState(() => eventDraft(event));
  const [organizerName, setOrganizerName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [catalogError, setCatalogError] = useState(false);
  const { busy, error, fail, run, clearError } = useAdminTask();
  useEffect(() => {
    let active = true;
    void getCategories().then(values => { if (active) setCategories(values); })
      .catch(error => { if (active) { setCatalogError(true); fail(error); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, fail]);
  const change = (key: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const closed = event?.status === 'cancelled' || event?.status === 'completed';
  const frozen = !!event && (closed || Date.parse(event.startsAt) <= now);
  const statuses: EventStatus[] = closed ? [event.status] : event?.status === 'published'
    ? ['published', 'cancelled', ...(Date.parse(event.startsAt) <= now ? ['completed' as const] : [])]
    : event ? ['draft', 'published', 'cancelled'] : ['draft', 'published'];
  const startDate = Number.isFinite(Date.parse(draft.startsAt)) ? new Date(draft.startsAt) : undefined;
  const save = () => run(async () => {
    const input = eventPayload(draft);
    if (event) {
      const changes = eventChanges(input, event);
      if (!Object.keys(changes).length) { onClose(); return; }
      await editEvent(token, event.id, changes);
    } else await createEvent(token, input);
    onSaved();
  });
  return <Sheet title={event ? 'Editar evento' : 'Crear evento'} busy={busy} onClose={onClose}>
    <Notice text="El evento pertenece al organizador seleccionado. La cuenta administrativa solo gestiona los datos." />
    {event ? <Notice text={`Organizador: usuario #${event.organizerId}. No se puede cambiar.`} /> : <>
      {draft.organizerId && <Notice text={`Seleccionado: ${organizerName} · #${draft.organizerId}`} />}
      <OrganizerPicker token={token} selected={draft.organizerId} disabled={busy} onSelect={user => { change('organizerId', user.id); setOrganizerName(user.profile.displayName || user.email); }} />
    </>}
    <Field label="Título" value={draft.title} onChangeText={value => change('title', value)} maxLength={140} editable={!busy} />
    <Field label="Descripción" value={draft.description} onChangeText={value => change('description', value)} maxLength={4000} multiline editable={!busy} />
    <Text style={s.label}>Categoría</Text>
    {loading ? <ActivityIndicator color="#1E5547" /> : <View style={s.row}>
      {categories.map(category => <Choice key={category.id} label={category.name} selected={draft.categoryId === category.id} disabled={busy} onPress={() => change('categoryId', category.id)} />)}
      {event && !categories.some(category => category.id === event.categoryId) && <Choice label={`Actual #${event.categoryId} (inactiva)`} selected={draft.categoryId === event.categoryId} onPress={() => change('categoryId', event.categoryId)} disabled={busy} />}
    </View>}
    {catalogError && <Choice label="Reintentar categorías" onPress={() => { setLoading(true); setCatalogError(false); clearError(); setAttempt(value => value + 1); }} />}
    {!loading && !catalogError && !categories.length && <Notice text="No hay categorías activas. No podrás crear un evento hasta que haya alguna disponible." />}
    <View style={{ height: 16 }} />
    {frozen && <Notice text="El lugar y el horario están bloqueados porque el evento ya comenzó o está cerrado." />}
    <Field label="Nombre del lugar" value={draft.locationName} onChangeText={value => change('locationName', value)} maxLength={160} editable={!busy && !frozen} />
    <Field label="Dirección (opcional)" value={draft.address} onChangeText={value => change('address', value)} maxLength={500} editable={!busy && !frozen} />
    <Field label="Punto de encuentro (opcional)" value={draft.meetingDetails} onChangeText={value => change('meetingDetails', value)} maxLength={250} editable={!busy && !frozen} />
    <LocationPicker disabled={busy || frozen}
      value={draft.latitude && draft.longitude ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : null}
      onChange={location => setDraft(current => ({ ...current, latitude: String(location.latitude), longitude: String(location.longitude) }))} />
    <Notice text="Selecciona el día y la hora usando los controles del dispositivo. Las horas se guardan con la zona America/Lima." />
    <DateTimeField label="Inicio" value={draft.startsAt} minimumDate={new Date(now)} disabled={busy || frozen} onChange={value => setDraft(current => {
      const currentEnd = Date.parse(current.endsAt);
      const suggestedEnd = new Date(Date.parse(value) + 2 * 60 * 60 * 1000).toISOString();
      return { ...current, startsAt: value, endsAt: !Number.isFinite(currentEnd) || currentEnd <= Date.parse(value) ? suggestedEnd : current.endsAt };
    })} />
    <DateTimeField label="Fin" value={draft.endsAt} minimumDate={startDate} disabled={busy || frozen} onChange={value => change('endsAt', value)} />
    <Field label="Precio · 0 para gratis" value={draft.price} onChangeText={value => change('price', value)} keyboardType="decimal-pad" editable={!busy} />
    <Field label="Moneda" value={draft.currency} onChangeText={value => change('currency', value)} maxLength={3} autoCapitalize="characters" editable={!busy} />
    <Field label="Cupo · vacío para sin límite" value={draft.capacity} onChangeText={value => change('capacity', value)} keyboardType="number-pad" editable={!busy} />
    <Notice text="El cupo incluye al organizador y no puede ser menor que la cantidad de inscritos." />
    <Text style={s.label}>Estado</Text><View style={s.row}>{statuses.map(status => <Choice key={status} label={labels[status]} selected={draft.status === status} disabled={busy} onPress={() => change('status', status)} />)}</View>
    {(draft.status === 'cancelled' || draft.status === 'completed') && !closed && <Notice text="Al guardar este estado, el evento quedará cerrado y no podrá reabrirse." />}
    {error && <Notice error text={error} />}
    <Button title={busy ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'} disabled={busy || loading || catalogError || !draft.organizerId || !draft.categoryId || !draft.latitude || !draft.longitude || !draft.startsAt || !draft.endsAt} onPress={save} />
  </Sheet>;
}
