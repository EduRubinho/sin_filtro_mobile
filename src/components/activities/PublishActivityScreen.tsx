import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { publishActivity } from '../../services/activities';
import { getCategories } from '../../services/auth';
import { eventDraft, eventPayload, type EventDraft } from '../../utils/eventForm';
import { ApiError } from '../../services/api';
import type { Category } from '../../types/auth';
import { Button } from '../ui/Button';
import { FormScreen } from '../ui/FormScreen';
import { LocationPicker } from '../ui/LocationPicker';
import { DateTimeField } from '../ui/DateTimeField';
import { Choice, Field, Notice, s } from '../ui/FormControls';

function initialDraft(userId: string): EventDraft {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { ...eventDraft(), organizerId: userId, status: 'published', startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function PublishActivityScreen() {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [draft, setDraft] = useState(() => initialDraft(session?.user.id ?? ''));
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startDate = Number.isFinite(Date.parse(draft.startsAt)) ? new Date(draft.startsAt) : undefined;

  useEffect(() => {
    let active = true;
    void getCategories().then(values => { if (active) setCategories(values); })
      .catch(() => { if (active) setError('No pudimos cargar las categorías.'); })
      .finally(() => { if (active) setLoadingCategories(false); });
    return () => { active = false; };
  }, []);

  const change = (key: keyof EventDraft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  async function submit() {
    if (busy) return;
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      const { organizerId: _organizerId, status: _status, ...input } = eventPayload(draft);
      await publishActivity(token, input);
      router.replace('/map');
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo publicar la actividad.');
    } finally {
      setBusy(false);
    }
  }

  return <FormScreen title="Publicar actividad" subtitle="Completa la información y elige el punto de encuentro en el mapa.">
    <Field label="Título" value={draft.title} onChangeText={value => change('title', value)} maxLength={140} editable={!busy} />
    <Field label="Descripción" value={draft.description} onChangeText={value => change('description', value)} maxLength={4000} multiline editable={!busy} />
    <Text style={s.label}>Categoría</Text>
    {loadingCategories ? <ActivityIndicator color="#1E5547" /> : <View style={s.row}>
      {categories.map(category => <Choice key={category.id} label={category.name} selected={draft.categoryId === category.id}
        disabled={busy} onPress={() => change('categoryId', category.id)} />)}
    </View>}
    {!loadingCategories && !categories.length && <Notice error text="No hay categorías disponibles para publicar." />}
    <View style={{ height: 18 }} />
    <Field label="Nombre del lugar" value={draft.locationName} onChangeText={value => change('locationName', value)} maxLength={160} editable={!busy} />
    <Field label="Dirección (opcional)" value={draft.address} onChangeText={value => change('address', value)} maxLength={500} editable={!busy} />
    <Field label="Punto de encuentro (opcional)" value={draft.meetingDetails} onChangeText={value => change('meetingDetails', value)} maxLength={250} editable={!busy} />
    <LocationPicker disabled={busy} value={draft.latitude && draft.longitude ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude) } : null}
      onChange={location => setDraft(current => ({ ...current, latitude: String(location.latitude), longitude: String(location.longitude) }))} />
    <Notice text="Fecha y hora · zona America/Lima" />
    <DateTimeField label="Inicio" value={draft.startsAt} minimumDate={new Date()} disabled={busy} onChange={value => setDraft(current => {
      const currentEnd = Date.parse(current.endsAt);
      const suggestedEnd = new Date(Date.parse(value) + 2 * 60 * 60 * 1000).toISOString();
      return { ...current, startsAt: value, endsAt: currentEnd <= Date.parse(value) ? suggestedEnd : current.endsAt };
    })} />
    <DateTimeField label="Fin" value={draft.endsAt} minimumDate={startDate} disabled={busy} onChange={value => change('endsAt', value)} />
    <Field label="Precio · 0 para gratis" value={draft.price} onChangeText={value => change('price', value)} keyboardType="decimal-pad" editable={!busy} />
    <Field label="Moneda" value={draft.currency} onChangeText={value => change('currency', value)} maxLength={3} autoCapitalize="characters" editable={!busy} />
    <Field label="Cupo · vacío para sin límite" value={draft.capacity} onChangeText={value => change('capacity', value)} keyboardType="number-pad" editable={!busy} />
    {error && <Notice error text={error} />}
    <Button title={busy ? 'Publicando…' : 'Publicar actividad'} disabled={busy || loadingCategories || !categories.length || !draft.categoryId || !draft.latitude || !draft.longitude} onPress={() => { void submit(); }} />
    <Button title="Cancelar" variant="secondary" disabled={busy} onPress={() => router.back()} />
  </FormScreen>;
}
