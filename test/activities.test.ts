import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { getMapActivities, publishActivity } from '../src/services/activities.ts';
const original = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com'; });
afterEach(() => { mock.restoreAll(); if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = original; });
const activity = { id: '1', title: 'Vóley', description: '', locationName: 'Parque', categoryName: 'Deporte', latitude: -12.04, longitude: -77.03,
  startsAt: '2027-01-01T12:00:00Z', endsAt: '2027-01-01T14:00:00Z', timeZone: 'America/Lima', price: 0, currency: 'PEN', distanceMeters: 12 };
test('el mapa consulta su endpoint con centro, radio y sesión, sin usar el CRUD admin', async () => {
  let path = '', headers: unknown;
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => { path = String(url); headers = init?.headers; return Response.json({ activities: [activity], hasMore: false }); });
  assert.deepEqual(await getMapActivities('token', -12.04, -77.03), { activities: [activity], hasMore: false });
  assert.equal(path, 'https://api.example.com/activities/map?lat=-12.04&lng=-77.03&radiusMeters=5000');
  assert.deepEqual(headers, { Authorization: 'Bearer token' });
  await assert.rejects(getMapActivities('token', 91, 0), { code: 'INVALID_INPUT' });
  await assert.rejects(getMapActivities('token', 0, 0, -1), { code: 'INVALID_INPUT' });
});
test('respuestas vacías, errores de sesión y marcadores inválidos', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ activities: [], hasMore: false }));
  assert.deepEqual(await getMapActivities('token', 0, 0), { activities: [], hasMore: false });
  for (const changed of [{ latitude: '12' }, { longitude: 181 }, { endsAt: 'bad' }, { price: -1 }, { distanceMeters: null }]) {
    mock.method(globalThis, 'fetch', async () => Response.json({ activities: [{ ...activity, ...changed }], hasMore: false }));
    await assert.rejects(getMapActivities('token', 0, 0), { code: 'SERVER' });
  }
  mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }));
  await assert.rejects(getMapActivities('token', 0, 0), { code: 'UNAUTHORIZED' });
});
test('usuario publica una actividad sin enviar organizador ni estado', async () => {
  let body: Record<string, unknown> = {}, method = '', authorization = '';
  mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body)); method = String(init?.method);
    authorization = (init?.headers as Record<string, string>).Authorization;
    return Response.json({ event: { id: '9' } }, { status: 201 });
  });
  const input = { categoryId: '1', title: 'Vóley', description: '', locationName: 'Parque', address: null, meetingDetails: null,
    latitude: -18.0066, longitude: -70.2463, startsAt: '2027-01-01T12:00:00Z', endsAt: '2027-01-01T14:00:00Z',
    timeZone: 'America/Lima', price: 0, currency: 'PEN', capacity: null };
  assert.equal(await publishActivity('token', input), '9');
  assert.equal(method, 'POST'); assert.equal(authorization, 'Bearer token');
  assert.deepEqual(body, input);
  assert.equal('organizerId' in body, false); assert.equal('status' in body, false);
  mock.method(globalThis, 'fetch', async () => Response.json({ event: {} }, { status: 201 }));
  await assert.rejects(publishActivity('token', input), { code: 'SERVER' });
});
