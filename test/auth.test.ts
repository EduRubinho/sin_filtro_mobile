import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import * as auth from '../src/services/auth.ts';

const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
  Object.defineProperty(globalThis, '__DEV__', { value: false, configurable: true });
});

afterEach(() => {
  mock.restoreAll();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  if (originalDev) Object.defineProperty(globalThis, '__DEV__', originalDev);
  else Reflect.deleteProperty(globalThis, '__DEV__');
});

const session = { token: 'a'.repeat(43), expiresAt: new Date(Date.now() + 60000).toISOString(), user: { id: '1', email: 'edu@example.com' } };

test('valida antes de enviar y normaliza solo el correo', async () => {
  let body: unknown;
  mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return Response.json(session);
  });
  await assert.rejects(auth.login({ email: 'invalid', password: 'password' }), { code: 'INVALID_INPUT' });
  await assert.rejects(auth.login({ email: 'edu@example.com', password: '' }), { code: 'INVALID_INPUT' });
  await assert.rejects(auth.login({ email: 'edu@example.com', password: 'a'.repeat(1025) }), { code: 'INVALID_INPUT' });
  assert.equal(body, undefined);
  await auth.login({ email: ' EDU@EXAMPLE.COM ', password: ' pass ' });
  assert.deepEqual(body, { email: 'edu@example.com', password: ' pass ' });
});

test('servicio envía JSON y bearer según contrato', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const transport: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/logout')) return new Response(null, { status: 204 });
    return Response.json(String(url).endsWith('/me') ? { user: session.user } : session);
  };
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  Object.defineProperty(globalThis, '__DEV__', { value: true, configurable: true });
  mock.method(globalThis, 'fetch', transport);
  assert.deepEqual(await auth.login({ email: 'edu@example.com', password: 'pass' }), session);
  assert.equal(calls[0].url, 'http://localhost:3000/auth/login');
  assert.equal(calls[0].init?.body, JSON.stringify({ email: 'edu@example.com', password: 'pass' }));
  assert.deepEqual(await auth.getCurrentUser(session.token), session.user);
  assert.deepEqual(calls[1].init?.headers, { Authorization: `Bearer ${session.token}` });
  await auth.logout(session.token);
  assert.equal(calls[2].url, 'http://localhost:3000/auth/logout');
  assert.equal(calls[2].init?.method, 'POST');
  assert.deepEqual(calls[2].init?.headers, { Authorization: `Bearer ${session.token}` });
});

test('traduce 401, 429 y fallos de red, rechaza respuestas inválidas', async () => {
  for (const [status, code] of [[400, 'INVALID_INPUT'], [401, 'UNAUTHORIZED'], [429, 'RATE_LIMITED'], [500, 'SERVER']] as const) {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status }));
    await assert.rejects(auth.getCurrentUser(session.token), { code });
  }
  mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
  await assert.rejects(auth.getCurrentUser(session.token), { code: 'NETWORK' });
  mock.method(globalThis, 'fetch', async () => Response.json({ token: 'bad' }));
  await assert.rejects(auth.login({ email: 'edu@example.com', password: 'pass' }), { code: 'SERVER' });
});

test('no envía credenciales si falta URL o si usa HTTP fuera de desarrollo', async () => {
  for (const url of [undefined, 'http://api.example.com', 'https://user:pass@api.example.com', 'https://api.example.com?key=value', 'https://api.example.com#fragment']) {
    if (url === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = url;
    const fetchMock = mock.method(globalThis, 'fetch', async () => { throw new Error('No debe llamar'); });
    await assert.rejects(auth.login({ email: 'edu@example.com', password: 'pass' }), { code: 'CONFIGURATION' });
    assert.equal(fetchMock.mock.callCount(), 0);
  }
});

test('rechaza sesiones vencidas, usuarios inválidos y JSON malformado', async () => {
  for (const data of [
    null,
    { ...session, expiresAt: new Date(0).toISOString() },
    { ...session, expiresAt: 'invalid' },
    { ...session, user: { id: 1, email: 'edu@example.com' } },
  ]) {
    mock.method(globalThis, 'fetch', async () => Response.json(data));
    await assert.rejects(auth.login({ email: 'edu@example.com', password: 'pass' }), { code: 'SERVER' });
  }

  mock.method(globalThis, 'fetch', async () => Response.json({ user: null }));
  await assert.rejects(auth.getCurrentUser(session.token), { code: 'SERVER' });

  mock.method(globalThis, 'fetch', async () => new Response('not json'));
  await assert.rejects(auth.getCurrentUser(session.token), { code: 'SERVER' });
});

test('cancela una petición que supera los 10 segundos', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  mock.method(globalThis, 'fetch', (_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));

  const pending = auth.getCurrentUser(session.token);
  context.mock.timers.tick(10_000);
  await assert.rejects(pending, { code: 'NETWORK' });
});
