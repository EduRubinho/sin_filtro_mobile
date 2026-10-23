import { request, ApiError } from './api.ts';
import { isUser } from './auth.ts';
import type { AdminUser } from '../types/admin.ts';
import type { EventInput, EventRecord } from '../types/event.ts';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[1-9][0-9]*$/.test(v);
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const nullableText = (v: unknown) => v === null || typeof v === 'string';
function isAdminUser(v: unknown): v is AdminUser {
  return isUser(v) && v.role === 'user' && object(v) && ['active', 'suspended', 'deleted'].includes(v.status as string) && date(v.createdAt);
}
function isEvent(v: unknown): v is EventRecord {
  return object(v) && id(v.id) && id(v.organizerId) && id(v.categoryId) &&
    ['title', 'description', 'locationName', 'timeZone', 'currency'].every(key => typeof v[key] === 'string') &&
    nullableText(v.address) && nullableText(v.meetingDetails) &&
    typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180 &&
    typeof v.price === 'number' && Number.isFinite(v.price) && v.price >= 0 &&
    (v.capacity === null || (typeof v.capacity === 'number' && Number.isInteger(v.capacity) && v.capacity > 0)) &&
    ['draft', 'published', 'cancelled', 'completed'].includes(v.status as string) &&
    [v.startsAt, v.endsAt, v.createdAt, v.updatedAt].every(date) && (v.completedAt === null || date(v.completedAt));
}
function invalid(): never { throw new ApiError('SERVER', 'El servidor devolvió datos administrativos inválidos.'); }
function pathId(value: string) { if (!id(value)) throw new ApiError('INVALID_INPUT', 'ID inválido.'); return value; }
function page(offset: number, limit: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new ApiError('INVALID_INPUT', 'Paginación inválida.');
  return `?limit=${limit}&offset=${offset}`;
}
async function list<T>(path: string, key: string, token: string, guard: (v: unknown) => v is T): Promise<T[]> {
  const data = await request(path, { token });
  if (!object(data) || !Array.isArray(data[key]) || !data[key].every(guard)) return invalid();
  return data[key];
}
async function single<T>(path: string, key: string, token: string, guard: (v: unknown) => v is T, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: unknown): Promise<T> {
  const data = await request(path, { token, method, body });
  if (!object(data) || !guard(data[key])) return invalid();
  return data[key];
}
export const listUsers = (token: string, offset = 0, limit = 20) => list(`/users${page(offset, limit)}`, 'users', token, isAdminUser);
export const getUser = (token: string, userId: string) => single(`/users/${pathId(userId)}`, 'user', token, isAdminUser);
export const createUser = (token: string, body: { email: string; password: string }) => single('/users', 'user', token, isAdminUser, 'POST', body);
export const editUser = (token: string, userId: string, body: { email?: string; password?: string }) => single(`/users/${pathId(userId)}`, 'user', token, isAdminUser, 'PATCH', body);
export const deleteUser = (token: string, userId: string) => request(`/users/${pathId(userId)}`, { token, method: 'DELETE' });
export const listEvents = (token: string, offset = 0, limit = 20) => list(`/events${page(offset, limit)}`, 'events', token, isEvent);
export const getEvent = (token: string, eventId: string) => single(`/events/${pathId(eventId)}`, 'event', token, isEvent);
export const createEvent = (token: string, body: EventInput) => single('/events', 'event', token, isEvent, 'POST', body);
export const editEvent = (token: string, eventId: string, body: Partial<Omit<EventInput, 'organizerId'>>) => single(`/events/${pathId(eventId)}`, 'event', token, isEvent, 'PATCH', body);
export const deleteEvent = (token: string, eventId: string) => request(`/events/${pathId(eventId)}`, { token, method: 'DELETE' });
