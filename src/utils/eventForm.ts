import type { EventInput, EventRecord, EventStatus } from '../types/event';
export interface EventDraft {
  organizerId: string; categoryId: string; title: string; description: string; locationName: string;
  address: string; meetingDetails: string; latitude: string; longitude: string; startsAt: string; endsAt: string;
  timeZone: string; price: string; currency: string; capacity: string; status: EventStatus;
}
export function eventDraft(event?: EventRecord): EventDraft {
  return { organizerId: event?.organizerId ?? '', categoryId: event?.categoryId ?? '', title: event?.title ?? '',
    description: event?.description ?? '', locationName: event?.locationName ?? '', address: event?.address ?? '', meetingDetails: event?.meetingDetails ?? '',
    latitude: event ? String(event.latitude) : '', longitude: event ? String(event.longitude) : '', startsAt: event?.startsAt ?? '', endsAt: event?.endsAt ?? '',
    timeZone: event?.timeZone ?? 'America/Lima', price: String(event?.price ?? 0), currency: event?.currency ?? 'PEN',
    capacity: event?.capacity == null ? '' : String(event.capacity), status: event?.status ?? 'draft' };
}
export function eventPayload(draft: EventDraft): EventInput {
  const numeric = (raw: string, label: string) => {
    if (!raw.trim() || !/^-?\d+(?:[.,]\d+)?$/.test(raw.trim())) throw new Error(`${label}: ingresa un número válido.`);
    const value = Number(raw.replace(',', '.'));
    if (!Number.isFinite(value)) throw new Error(`${label}: número inválido.`);
    return value;
  };
  if (!draft.organizerId || !draft.categoryId) throw new Error('Selecciona organizador y categoría.');
  if (!draft.title.trim() || !draft.locationName.trim()) throw new Error('Completa el título y el lugar.');
  const latitude = numeric(draft.latitude, 'Latitud'), longitude = numeric(draft.longitude, 'Longitud');
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Latitud: −90 a 90. Longitud: −180 a 180.');
  const startsAt = draft.startsAt.trim(), endsAt = draft.endsAt.trim();
  for (const value of [startsAt, endsAt]) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Ingresa fechas con hora y zona, por ejemplo 2027-01-15T17:00:00-05:00.');
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('El fin debe ser posterior al inicio.');
  const price = numeric(draft.price, 'Precio');
  if (price < 0) throw new Error('El precio no puede ser negativo.');
  const capacity = draft.capacity.trim() ? numeric(draft.capacity, 'Cupo') : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) throw new Error('El cupo debe ser un entero positivo.');
  return { ...draft, title: draft.title.trim(), locationName: draft.locationName.trim(), description: draft.description.trim(),
    address: draft.address.trim() || null, meetingDetails: draft.meetingDetails.trim() || null, latitude, longitude, startsAt, endsAt,
    timeZone: draft.timeZone.trim(), price, currency: draft.currency.trim().toUpperCase(), capacity };
}
/** Envía solo cambios para no sobrescribir otros campos editados mientras el formulario estaba abierto. */
export function eventChanges(input: EventInput, previous: EventRecord): Partial<Omit<EventInput, 'organizerId'>> {
  return Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== 'organizerId' && value !== previous[key as keyof EventRecord]));
}
