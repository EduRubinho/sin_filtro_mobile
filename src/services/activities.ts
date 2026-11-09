import { request, ApiError } from './api.ts';
import type { ActivityParticipant, MapActivity, MapActivities } from '../types/activity.ts';
import type { ActivityDetail, EventStatus, PublishActivityInput } from '../types/event.ts';


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

function isParticipant(value: unknown): value is ActivityParticipant {
  if (!value || typeof value !== 'object') return false;
  const participant = value as Record<string, unknown>;
  return typeof participant.id === 'string' && /^[1-9][0-9]*$/.test(participant.id) &&
    typeof participant.displayName === 'string' && participant.displayName.length > 0 && participant.displayName.length <= 254 &&
    typeof participant.joinedAt === 'string' && Number.isFinite(Date.parse(participant.joinedAt));
}

function isActivityDetail(value: unknown): value is ActivityDetail {
  if (!value || typeof value !== 'object') return false;
  const activity = value as Record<string, unknown>;
  const organizer = activity.organizer as Record<string, unknown> | undefined;
  const viewer = activity.viewer as Record<string, unknown> | undefined;
  const statuses: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];
  return typeof activity.id === 'string' && /^[1-9][0-9]*$/.test(activity.id) &&
    typeof activity.organizerId === 'string' && typeof activity.categoryId === 'string' &&
    ['title', 'description', 'locationName', 'timeZone', 'currency', 'categoryName'].every(key => typeof activity[key] === 'string') &&
    (activity.address === null || typeof activity.address === 'string') &&
    (activity.meetingDetails === null || typeof activity.meetingDetails === 'string') &&
    typeof activity.latitude === 'number' && Number.isFinite(activity.latitude) && Math.abs(activity.latitude) <= 90 &&
    typeof activity.longitude === 'number' && Number.isFinite(activity.longitude) && Math.abs(activity.longitude) <= 180 &&
    typeof activity.price === 'number' && Number.isFinite(activity.price) && activity.price >= 0 &&
    (activity.capacity === null || typeof activity.capacity === 'number' && Number.isInteger(activity.capacity) && activity.capacity > 0) &&
    typeof activity.status === 'string' && statuses.includes(activity.status as EventStatus) &&
    typeof activity.startsAt === 'string' && Number.isFinite(Date.parse(activity.startsAt)) &&
    typeof activity.endsAt === 'string' && Number.isFinite(Date.parse(activity.endsAt)) &&
    (activity.completedAt === null || typeof activity.completedAt === 'string' && Number.isFinite(Date.parse(activity.completedAt))) &&
    typeof activity.createdAt === 'string' && Number.isFinite(Date.parse(activity.createdAt)) &&
    typeof activity.updatedAt === 'string' && Number.isFinite(Date.parse(activity.updatedAt)) &&
    !!organizer && typeof organizer.id === 'string' && typeof organizer.displayName === 'string' &&
    Array.isArray(activity.participants) && activity.participants.every(isParticipant) &&
    typeof activity.participantCount === 'number' && Number.isInteger(activity.participantCount) && activity.participantCount === activity.participants.length &&
    (activity.availableSpots === null || typeof activity.availableSpots === 'number' && Number.isInteger(activity.availableSpots) && activity.availableSpots >= 0) &&
    !!viewer && typeof viewer.isOrganizer === 'boolean' && typeof viewer.isJoined === 'boolean';
}

function activityResponse(data: unknown): ActivityDetail {
  if (!data || typeof data !== 'object' || !('activity' in data) || !isActivityDetail(data.activity)) {
    throw new ApiError('SERVER', 'El servidor devolvió un detalle de actividad inválido.');
  }
  return data.activity;
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

export async function getActivity(token: string, id: string): Promise<ActivityDetail> {
  return activityResponse(await request(`/activities/${id}`, { token }));
}

export async function getActivityParticipants(token: string, id: string): Promise<ActivityParticipant[]> {
  const data = await request(`/activities/${id}/participants`, { token });
  if (!data || typeof data !== 'object' || !('participants' in data) || !Array.isArray(data.participants) || !data.participants.every(isParticipant)) {
    throw new ApiError('SERVER', 'El servidor devolvió participantes inválidos.');
  }
  return data.participants;
}

export async function joinActivity(token: string, id: string): Promise<ActivityDetail> {
  return activityResponse(await request(`/activities/${id}/join`, { token, method: 'POST' }));
}

export async function leaveActivity(token: string, id: string): Promise<ActivityDetail> {
  return activityResponse(await request(`/activities/${id}/join`, { token, method: 'DELETE' }));
}

export async function updateActivity(token: string, id: string, input: PublishActivityInput): Promise<ActivityDetail> {
  return activityResponse(await request(`/activities/${id}`, { token, method: 'PATCH', body: input }));
}

export async function cancelActivity(token: string, id: string): Promise<ActivityDetail> {
  return activityResponse(await request(`/activities/${id}/cancel`, { token, method: 'POST' }));
}
