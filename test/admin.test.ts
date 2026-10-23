import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import * as admin from '../src/services/admin.ts';
import { eventChanges, eventDraft, eventPayload } from '../src/utils/eventForm.ts';
import type { EventRecord } from '../src/types/event.ts';
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com'; });
afterEach(() => { mock.restoreAll(); if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = originalUrl; });
const user = { id: '2', email: 'user@example.com', role: 'user', status: 'active', createdAt: '2026-01-01T00:00:00Z', profile: { displayName: null, bio: '', interestIds: [], completed: false } };
const event: EventRecord = { id: '1', organizerId: '2', categoryId: '1', title: 'Vóley', description: '', locationName: 'Parque', address: null, meetingDetails: null,
  latitude: -12, longitude: -77, startsAt: '2027-01-01T17:00:00-05:00', endsAt: '2027-01-01T19:00:00-05:00', timeZone: 'America/Lima', price: 0, currency: 'PEN', capacity: null, status: 'draft', completedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
test('CRUD de usuarios envía token, paginación y cuerpos correctos, DELETE acepta 204', async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    calls.push({ path: String(url), init });
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json(String(url).includes('?') ? { users: [user] } : { user });
  });
  assert.deepEqual(await admin.listUsers('token', 20), [user]);
  assert.deepEqual(await admin.getUser('token', '2'), user);
  await admin.createUser('token', { email: user.email, password: 'password123' });
  await admin.editUser('token', '2', { email: 'new@example.com' });
  await admin.deleteUser('token', '2');
  assert.equal(calls[0].path, 'https://api.example.com/users?limit=20&offset=20');
  assert.deepEqual(calls.map(value => value.init?.method), ['GET', 'GET', 'POST', 'PATCH', 'DELETE']);
  assert.deepEqual(JSON.parse(String(calls[3].init?.body)), { email: 'new@example.com' });
  for (const call of calls) assert.equal((call.init?.headers as Record<string, string>).Authorization, 'Bearer token');
  assert.throws(() => admin.getUser('token', '../admin'), { code: 'INVALID_INPUT' });
});
test('CRUD de eventos valida respuesta y conserva mensajes de conflicto del backend', async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    calls.push({ path: String(url), init });
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json(String(url).includes('?') ? { events: [event] } : { event });
  });
  assert.deepEqual(await admin.listEvents('token'), [event]);
  assert.deepEqual(await admin.getEvent('token', '1'), event);
  await admin.createEvent('token', eventPayload(eventDraft(event)));
  await admin.editEvent('token', '1', { title: 'Nuevo título' });
  await admin.deleteEvent('token', '1');
  assert.deepEqual(calls.map(value => value.init?.method), ['GET', 'GET', 'POST', 'PATCH', 'DELETE']);
  assert.deepEqual(JSON.parse(String(calls[3].init?.body)), { title: 'Nuevo título' });
  mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'El usuario tiene eventos asociados.' } }, { status: 409 }));
  await assert.rejects(admin.deleteUser('token', '2'), { code: 'CONFLICT', message: 'El usuario tiene eventos asociados.' });
  mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 404 }));
  await assert.rejects(admin.getEvent('token', '1'), { code: 'NOT_FOUND' });
});
test('no acepta administradores en listado de usuarios ni eventos con datos malformados', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ users: [{ ...user, role: 'admin' }] }));
  await assert.rejects(admin.listUsers('token'), { code: 'SERVER' });
  mock.method(globalThis, 'fetch', async () => Response.json({ event: { ...event, latitude: '12' } }));
  await assert.rejects(admin.getEvent('token', '1'), { code: 'SERVER' });
  for (const [status, code] of [[401, 'UNAUTHORIZED'], [403, 'FORBIDDEN']] as const) {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
    await assert.rejects(admin.listEvents('token'), { code });
  }
});
test('formulario conserva fechas y ceros, transforma opcionales y PATCH omite organizador y campos sin cambios', () => {
  const draft = eventDraft(event);
  const payload = eventPayload(draft);
  assert.equal(payload.startsAt, event.startsAt);
  assert.equal(payload.capacity, null);
  assert.equal(payload.price, 0);
  assert.deepEqual(eventChanges(payload, event), {});
  assert.deepEqual(eventChanges({ ...payload, title: 'Otro título', organizerId: '999' }, event), { title: 'Otro título' });
  assert.equal(eventPayload({ ...draft, latitude: '-12,5' }).latitude, -12.5);
  for (const changes of [{ longitude: '' }, { latitude: '91' }, { capacity: '0' }, { capacity: '2.5' }, { organizerId: '' }, { price: '-1' }, { endsAt: draft.startsAt }, { startsAt: 'mañana' }]) {
    assert.throws(() => eventPayload({ ...draft, ...changes }));
  }
});
