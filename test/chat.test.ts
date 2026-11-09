import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { chatSocketUrl, getChatMessages, markChatRead, parseChatSocketEvent, sendChatMessage } from '../src/services/chat.ts';

const original = process.env.EXPO_PUBLIC_API_URL;
beforeEach(() => { process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com'; });
afterEach(() => { mock.restoreAll(); if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL; else process.env.EXPO_PUBLIC_API_URL = original; });

const message = { id: '9', activityId: '3', body: 'Nos vemos en la entrada', createdAt: '2027-01-01T12:00:00Z',
  sender: { id: '2', displayName: 'Andrea', avatarUrl: null, isOrganizer: true } };
const chat = { activityId: '3', activityTitle: 'Vóley', readOnly: false, availableUntil: '2027-01-02T12:00:00Z', unreadCount: 1 };

test('chat carga historial, envía mensajes y marca lectura', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  mock.method(globalThis, 'fetch', async (url: unknown, init?: RequestInit) => {
    calls.push({ url: String(url), method: String(init?.method ?? 'GET'), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (String(url).endsWith('/read')) return new Response(null, { status: 204 });
    if (init?.method === 'POST') return Response.json({ message }, { status: 201 });
    return Response.json({ chat, messages: [message], hasMore: false });
  });
  assert.deepEqual(await getChatMessages('token', '3'), { chat, messages: [message], hasMore: false });
  assert.deepEqual(await sendChatMessage('token', '3', message.body), message);
  await markChatRead('token', '3', '9');
  assert.equal(calls[0].url, 'https://api.example.com/activities/3/chat/messages?limit=30');
  assert.deepEqual(calls.map(call => call.method), ['GET', 'POST', 'POST']);
  assert.deepEqual(calls[2].body, { messageId: '9' });
});

test('protocolo WebSocket valida eventos y convierte HTTPS en WSS', () => {
  assert.equal(chatSocketUrl(), 'wss://api.example.com/ws');
  assert.deepEqual(parseChatSocketEvent(JSON.stringify({ type: 'message', activityId: '3', message })), { type: 'message', activityId: '3', message });
  assert.deepEqual(parseChatSocketEvent('{"type":"authenticated"}'), { type: 'authenticated' });
  assert.equal(parseChatSocketEvent('{"type":"message","activityId":"3"}'), null);
  assert.equal(parseChatSocketEvent('no-json'), null);
});
