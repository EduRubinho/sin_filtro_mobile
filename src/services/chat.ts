import { ApiError, getWebSocketUrl, request } from './api.ts';
import type { ChatInfo, ChatMessage, ChatPage, ChatSocketEvent } from '../types/chat.ts';

function isId(value: unknown): value is string { return typeof value === 'string' && /^[1-9][0-9]*$/.test(value); }

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  const sender = message.sender as Record<string, unknown> | undefined;
  return isId(message.id) && isId(message.activityId) && typeof message.body === 'string' && message.body.length > 0 && message.body.length <= 1000 &&
    typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt)) && !!sender && isId(sender.id) &&
    typeof sender.displayName === 'string' && sender.displayName.length > 0 && sender.avatarUrl === null && typeof sender.isOrganizer === 'boolean';
}

function isChatInfo(value: unknown): value is ChatInfo {
  if (!value || typeof value !== 'object') return false;
  const chat = value as Record<string, unknown>;
  return isId(chat.activityId) && typeof chat.activityTitle === 'string' && chat.activityTitle.length > 0 &&
    typeof chat.readOnly === 'boolean' && typeof chat.availableUntil === 'string' && Number.isFinite(Date.parse(chat.availableUntil)) &&
    typeof chat.unreadCount === 'number' && Number.isInteger(chat.unreadCount) && chat.unreadCount >= 0;
}

export async function getChatMessages(token: string, activityId: string, beforeId?: string, limit = 30): Promise<ChatPage> {
  const query = new URLSearchParams({ limit: String(limit), ...(beforeId ? { beforeId } : {}) });
  const data = await request(`/activities/${activityId}/chat/messages?${query}`, { token });
  if (!data || typeof data !== 'object') throw new ApiError('SERVER', 'No se pudo leer el chat.');
  const page = data as Record<string, unknown>;
  if (!isChatInfo(page.chat) || !Array.isArray(page.messages) || !page.messages.every(isChatMessage) || typeof page.hasMore !== 'boolean') {
    throw new ApiError('SERVER', 'El servidor devolvió un chat inválido.');
  }
  return { chat: page.chat, messages: page.messages, hasMore: page.hasMore };
}

export async function sendChatMessage(token: string, activityId: string, body: string): Promise<ChatMessage> {
  const data = await request(`/activities/${activityId}/chat/messages`, { token, method: 'POST', body: { body } });
  if (!data || typeof data !== 'object' || !('message' in data) || !isChatMessage(data.message)) {
    throw new ApiError('SERVER', 'El servidor no confirmó el mensaje.');
  }
  return data.message;
}

export async function markChatRead(token: string, activityId: string, messageId: string): Promise<void> {
  await request(`/activities/${activityId}/chat/read`, { token, method: 'POST', body: { messageId } });
}

export function chatSocketUrl() { return getWebSocketUrl(); }

export function parseChatSocketEvent(raw: unknown): ChatSocketEvent | null {
  if (typeof raw !== 'string') return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const event = value as Record<string, unknown>;
    if (event.type === 'connected' || event.type === 'authenticated') return { type: event.type };
    if (event.type === 'subscribed' && isId(event.activityId)) return { type: 'subscribed', activityId: event.activityId };
    if (event.type === 'message' && isId(event.activityId) && isChatMessage(event.message)) return { type: 'message', activityId: event.activityId, message: event.message };
    if (event.type === 'error' && typeof event.message === 'string') return { type: 'error', message: event.message };
    return null;
  } catch { return null; }
}
