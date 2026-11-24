import { request, ApiError } from './api.ts';
import type { AttendanceInfo, IssuedPin } from '../types/attendance.ts';

const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
function path(id: string) {
  if (!/^[1-9][0-9]*$/.test(id)) throw new ApiError('INVALID_INPUT', 'Actividad inválida.');
  return `/activities/${id}/attendance`;
}
function invalid(): never { throw new ApiError('SERVER', 'El servidor devolvió datos de asistencia inválidos.'); }

export async function getAttendance(token: string, id: string): Promise<AttendanceInfo> {
  const data = await request(path(id), { token });
  if (!data || typeof data !== 'object') return invalid();
  const v = data as AttendanceInfo;
  if (!date(v.opensAt) || !date(v.closesAt) || typeof v.open !== 'boolean' || typeof v.isOrganizer !== 'boolean' ||
      !nullableDate(v.validatedAt) || !nullableDate(v.lockedUntil) || !nullableDate(v.codeExpiresAt) ||
      ![v.enrolled, v.confirmed, v.pending].every(n => Number.isInteger(n) && n >= 0) || v.confirmed + v.pending !== v.enrolled ||
      !Array.isArray(v.participants) || !v.participants.every(p => p && typeof p.id === 'string' && typeof p.displayName === 'string' && nullableDate(p.validatedAt))) return invalid();
  return v;
}
export async function issueAttendancePin(token: string, id: string): Promise<IssuedPin> {
  const data = await request(`${path(id)}/pin`, { token, method: 'POST' });
  if (!data || typeof data !== 'object' || !('pin' in data) || typeof data.pin !== 'string' || !/^\d{6}$/.test(data.pin) ||
      !('expiresAt' in data) || !date(data.expiresAt)) return invalid();
  return { pin: data.pin, expiresAt: data.expiresAt };
}
export async function revokeAttendancePin(token: string, id: string) {
  await request(`${path(id)}/pin`, { token, method: 'DELETE' });
}
export async function validateAttendance(token: string, id: string, pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new ApiError('INVALID_INPUT', 'Ingresa los seis dígitos del PIN.');
  const data = await request(`${path(id)}/validate`, { token, method: 'POST', body: { pin } });
  if (!data || typeof data !== 'object' || !('validatedAt' in data) || !date(data.validatedAt)) return invalid();
  return data.validatedAt;
}
