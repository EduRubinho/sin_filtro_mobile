import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { getAttendance, issueAttendancePin, revokeAttendancePin, validateAttendance } from '../src/services/attendance.ts';

const original = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com'; });
afterEach(() => { mock.restoreAll(); if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = original; });
const info = { opensAt: '2027-01-01T12:00:00Z', closesAt: '2027-01-01T13:00:00Z', open: true, isOrganizer: false,
  validatedAt: null, lockedUntil: null, codeExpiresAt: null, enrolled: 1, confirmed: 0, pending: 1, participants: [] };
test('servicio de asistencia conserva ceros, usa sesión y envía solo el PIN', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer token');
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    if (String(url).endsWith('/validate')) return Response.json({ validatedAt: info.opensAt });
    if (String(url).endsWith('/pin')) return Response.json({ pin: '001234', expiresAt: info.closesAt });
    return Response.json(info);
  });
  assert.deepEqual(await getAttendance('token', '3'), info);
  assert.equal((await issueAttendancePin('token', '3')).pin, '001234');
  assert.equal(await validateAttendance('token', '3', '001234'), info.opensAt);
  await revokeAttendancePin('token', '3');
  assert.deepEqual(calls.map(c => c.method), ['GET', 'POST', 'POST', 'DELETE']);
  assert.deepEqual(calls[2].body, { pin: '001234' });
  assert.equal(calls[2].url, 'https://api.example.com/activities/3/attendance/validate');
});
test('asistencia rechaza respuestas mal formadas y conserva mensajes del bloqueo', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ ...info, confirmed: 5 }));
  await assert.rejects(getAttendance('token', '3'), /inválidos/);
  await assert.rejects(validateAttendance('token', '3', '12345'), /seis dígitos/);
  mock.restoreAll();
  mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'Espera 30 segundos antes de generar otro PIN.' } }, { status: 429 }));
  await assert.rejects(issueAttendancePin('token', '3'), /30 segundos/);
});
