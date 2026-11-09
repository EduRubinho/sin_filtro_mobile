import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './useAuth';
import { chatSocketUrl, getChatMessages, markChatRead, parseChatSocketEvent, sendChatMessage } from '../services/chat';
import { ApiError } from '../services/api';
import type { ChatInfo, ChatMessage } from '../types/chat';

function addMessage(messages: ChatMessage[], message: ChatMessage) {
  return messages.some(item => item.id === message.id) ? messages : [message, ...messages];
}

export function useActivityChat(activityId: string) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatReady = chat !== null;

  const read = useCallback((messageId: string) => {
    void markChatRead(token, activityId, messageId).then(() => setChat(current => current ? { ...current, unreadCount: 0 } : current))
      .catch(caught => { if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession(); });
  }, [activityId, expireSession, token]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const page = await getChatMessages(token, activityId);
      setChat(page.chat); setMessages([...page.messages].reverse()); setHasMore(page.hasMore);
      const newest = page.messages.at(-1);
      if (newest) read(newest.id);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el chat.');
    } finally { setLoading(false); }
  }, [activityId, expireSession, read, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useEffect(() => {
    if (!token || !activityId || !chatReady) return;
    let active = true;
    let socket: WebSocket | null = null;
    const connect = () => {
      if (!active) return;
      try { socket = new WebSocket(chatSocketUrl()); }
      catch { setError('No se pudo configurar la conexión en tiempo real.'); return; }
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'authenticate', token }));
      socket.onmessage = event => {
        const input = parseChatSocketEvent(event.data);
        if (!input) return;
        if (input.type === 'authenticated') socket?.send(JSON.stringify({ type: 'subscribe', activityId }));
        if (input.type === 'subscribed' && input.activityId === activityId) setConnected(true);
        if (input.type === 'message' && input.activityId === activityId) {
          setMessages(current => addMessage(current, input.message));
          read(input.message.id);
        }
        if (input.type === 'error') setError(input.message);
      };
      socket.onclose = event => {
        setConnected(false);
        if (!active) return;
        if (event.code === 4001) { expireSession(); return; }
        if (event.code === 4003) { setError('Ya no tienes acceso a este chat.'); return; }
        reconnect.current = setTimeout(connect, 2000);
      };
      socket.onerror = () => setConnected(false);
    };
    connect();
    return () => {
      active = false;
      if (reconnect.current) clearTimeout(reconnect.current);
      socket?.close();
    };
  }, [activityId, chatReady, expireSession, read, token]);

  async function loadMore() {
    const oldest = messages.at(-1);
    if (!oldest || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getChatMessages(token, activityId, oldest.id);
      setChat(page.chat); setHasMore(page.hasMore);
      setMessages(current => [...current, ...[...page.messages].reverse().filter(item => !current.some(existing => existing.id === item.id))]);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudieron cargar mensajes anteriores.');
    } finally { setLoadingMore(false); }
  }

  async function send(body: string) {
    if (sending) return false;
    setSending(true); setError(null);
    try {
      const message = await sendChatMessage(token, activityId, body);
      setMessages(current => addMessage(current, message));
      read(message.id);
      return true;
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'UNAUTHORIZED') expireSession();
      setError(caught instanceof Error ? caught.message : 'No se pudo enviar el mensaje.');
      return false;
    } finally { setSending(false); }
  }

  return { chat, messages, loading, loadingMore, sending, connected, error, load, loadMore, send };
}
