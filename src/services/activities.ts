import { request, ApiError } from './api.ts';
import type { MapActivity, MapActivities } from '../types/activity.ts';
import type { PublishActivityInput } from '../types/event.ts';


function isActivity(value: unknown): value is MapActivity {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^[1-9][0-9]*$/.test(v.id) &&
    ['title', 'description', 'locationName', 'categoryName', 'timeZone', 'currency'].every(key => typeof v[key] === 'string') &&
    typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180 &&
    typeof v.price === 'number' && Number.isFinite(v.price) && v.price >= 0 &&
    typeof v.distanceMeters === 'number' && Number.isFinite(v.distanceMeters) && v.distanceMeters >= 0 &&
    typeof v.startsAt === 'string' && Number.isFinite(Date.parse(v.startsAt)) &&
    typeof v.endsAt === 'string' && Number.isFinite(Date.parse(v.endsAt)) && Date.parse(v.endsAt) > Date.parse(v.startsAt);
}


export async function getMapActivities(token: string, latitude: number, longitude: number, radiusMeters = 5000): Promise<MapActivities> {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > 10000) {
    throw new ApiError('INVALID_INPUT', 'Ubicación de búsqueda inválida.');
  }
  const query = new URLSearchParams({ lat: String(latitude), lng: String(longitude), radiusMeters: String(radiusMeters) });
  const data = await request(`/activities/map?${query}`, { token });
  if (!data || typeof data !== 'object') throw new ApiError('SERVER', 'No se pudieron leer las actividades.');
  const result = data as Record<string, unknown>;
  if (!Array.isArray(result.activities) || result.activities.length > 100 || !result.activities.every(isActivity) || typeof result.hasMore !== 'boolean') {
    throw new ApiError('SERVER', 'El servidor devolvió actividades inválidas.');
  }
  return { activities: result.activities, hasMore: result.hasMore };
}

export async function publishActivity(token: string, input: PublishActivityInput): Promise<string> {
  const data = await request('/activities', { token, method: 'POST', body: input });
  if (!data || typeof data !== 'object' || !('event' in data) || !data.event || typeof data.event !== 'object' ||
    !('id' in data.event) || typeof data.event.id !== 'string' || !/^[1-9][0-9]*$/.test(data.event.id)) {
    throw new ApiError('SERVER', 'El servidor no confirmó la actividad publicada.');
  }
  return data.event.id;
}
