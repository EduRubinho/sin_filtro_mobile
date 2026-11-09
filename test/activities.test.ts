import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { cancelActivity, getActivity, getActivityParticipants, getMapActivities, getMyPlans, joinActivity, leaveActivity, publishActivity, updateActivity } from '../src/services/activities.ts';
const original = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com'; });
afterEach(() => { mock.restoreAll(); if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = original; });
const activity = { id: '1', title: 'Vóley', description: '', locationName: 'Parque', categoryName: 'Deporte', latitude: -12.04, longitude: -77.03,
  startsAt: '2027-01-01T12:00:00Z', endsAt: '2027-01-01T14:00:00Z', timeZone: 'America/Lima', price: 0, currency: 'PEN', distanceMeters: 12 };
const detail = { ...activity, organizerId: '2', categoryId: '1', address: null, meetingDetails: null, capacity: 10, status: 'published',
  completedAt: null, createdAt: '2026-12-01T12:00:00Z', updatedAt: '2026-12-01T12:00:00Z',
  organizer: { id: '2', displayName: 'Andrea' }, participants: [{ id: '3', displayName: 'Lucía', joinedAt: '2026-12-15T12:00:00Z' }],
  participantCount: 1, availableSpots: 9, viewer: { isOrganizer: false, isJoined: true } };
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
test('detalle y participación usan rutas del usuario y validan sus respuestas', async () => {
  const calls: { url: string; method: string }[] = [];
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), method: String(init?.method ?? 'GET') });
    if (String(url).endsWith('/participants')) return Response.json({ participants: detail.participants, participantCount: 1 });
    return Response.json({ activity: detail });
  });
  assert.deepEqual(await getActivity('token', '1'), detail);
  assert.deepEqual(await getActivityParticipants('token', '1'), detail.participants);
  assert.deepEqual(await joinActivity('token', '1'), detail);
  assert.deepEqual(await leaveActivity('token', '1'), detail);
  assert.deepEqual(await cancelActivity('token', '1'), detail);
  const input = { categoryId: '1', title: 'Vóley', description: '', locationName: 'Parque', address: null, meetingDetails: null,
    latitude: -12.04, longitude: -77.03, startsAt: detail.startsAt, endsAt: detail.endsAt, timeZone: 'America/Lima', price: 0, currency: 'PEN', capacity: 10 };
  assert.deepEqual(await updateActivity('token', '1', input), detail);
  assert.deepEqual(calls.map(call => [call.url.replace('https://api.example.com', ''), call.method]), [
    ['/activities/1', 'GET'], ['/activities/1/participants', 'GET'], ['/activities/1/join', 'POST'],
    ['/activities/1/join', 'DELETE'], ['/activities/1/cancel', 'POST'], ['/activities/1', 'PATCH'],
  ]);
  mock.method(globalThis, 'fetch', async () => Response.json({ activity: { ...detail, participantCount: 2 } }));
  await assert.rejects(getActivity('token', '1'), { code: 'SERVER' });
});
test('mis planes separa actividades organizadas y participadas', async () => {
  const organized = { id: '8', title: 'Café', locationName: 'Centro', categoryName: 'Café', startsAt: '2027-02-01T12:00:00Z',
    endsAt: '2027-02-01T14:00:00Z', status: 'published', capacity: 6, participantCount: 2, relation: 'organizer',
    chatAvailable: true, chatReadOnly: false, unreadCount: 3 };
  const participating = { ...organized, id: '9', title: 'Arte', status: 'completed', relation: 'participant', chatReadOnly: true };
  let url = '';
  mock.method(globalThis, 'fetch', async (value: unknown) => { url = String(value); return Response.json({ organized: [organized], participating: [participating] }); });
  assert.deepEqual(await getMyPlans('token'), { organized: [organized], participating: [participating] });
  assert.equal(url, 'https://api.example.com/activities/mine');
  mock.method(globalThis, 'fetch', async () => Response.json({ organized: [{ ...organized, relation: 'participant' }], participating: [] }));
  await assert.rejects(getMyPlans('token'), { code: 'SERVER' });
});
