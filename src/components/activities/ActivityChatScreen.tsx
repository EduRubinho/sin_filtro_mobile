import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityChat } from '../../hooks/useActivityChat';
import { useAuth } from '../../hooks/useAuth';
import type { ChatMessage } from '../../types/chat';
import { colors } from '../ui/theme';

export function ActivityChatScreen({ activityId }: { activityId: string }) {
  const { session } = useAuth();
  const { chat, messages, loading, loadingMore, sending, connected, error, load, loadMore, send } = useActivityChat(activityId);
  const [text, setText] = useState('');

  async function submit() {
    const body = text.trim();
    if (!body || body.length > 1000) return;
    if (await send(body)) setText('');
  }

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <View style={styles.heading}><Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{chat?.activityTitle || 'Chat de la actividad'}</Text><View style={styles.connection}><View style={[styles.dot, connected && styles.dotOnline]} /><Text style={styles.connectionText}>{connected ? 'En tiempo real' : 'Conectando…'}</Text></View></View>
      </View>
      {chat?.readOnly && <View style={styles.readOnly}><Text style={styles.readOnlyText}>Este encuentro terminó. El chat está disponible solo para lectura temporalmente.</Text></View>}
      {error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
      {hasNoMessages(loading, messages)
        ? <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Empieza la coordinación</Text>
          <Text style={styles.emptyText}>Aquí pueden acordar el punto de encuentro y qué necesita llevar cada persona.</Text>
        </View>
        : <FlatList inverted data={messages} keyExtractor={message => message.id} contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled" onEndReached={() => { void loadMore(); }} onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.ink} /> : undefined}
          renderItem={({ item }) => <MessageBubble message={item} own={item.sender.id === session?.user.id} />}
        />}
      {loading && !messages.length ? <View style={styles.loading}><ActivityIndicator color={colors.ink} /><Text style={styles.emptyText}>Cargando mensajes…</Text></View> : null}
      {!chat && !loading && <Pressable accessibilityRole="button" onPress={() => { void load(); }} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable>}
      {chat && !chat.readOnly && <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} editable={!sending} multiline maxLength={1000} placeholder="Escribe un mensaje" placeholderTextColor="#7A817D" style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" disabled={sending || !text.trim()} onPress={() => { void submit(); }} style={[styles.send, (sending || !text.trim()) && styles.disabled]}><Text style={styles.sendText}>➤</Text></Pressable>
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function MessageBubble({ message, own }: { message: ChatMessage; own: boolean }) {
  return <View style={[styles.messageRow, own && styles.ownRow]}>
    {!own && <View style={styles.avatar}><Text style={styles.avatarText}>{message.sender.displayName.slice(0, 1).toUpperCase()}</Text></View>}
    <View style={[styles.bubble, own && styles.ownBubble]}>
      {!own && <View style={styles.senderRow}><Text style={styles.sender}>{message.sender.displayName}</Text>{message.sender.isOrganizer && <Text style={styles.organizer}>ORGANIZA</Text>}</View>}
      <Text style={[styles.body, own && styles.ownBody]}>{message.body}</Text>
      <Text style={[styles.time, own && styles.ownTime]}>{new Date(message.createdAt).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}</Text>
    </View>
  </View>;
}

function hasNoMessages(loading: boolean, messages: ChatMessage[]) { return !loading && messages.length === 0; }

const styles = StyleSheet.create({
  fill: { flex: 1 }, screen: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, backText: { color: colors.ink, fontSize: 38, lineHeight: 39, marginTop: -4 }, heading: { flex: 1, paddingRight: 20 }, title: { color: colors.ink, fontSize: 18, fontWeight: '900' }, connection: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#B7BDB9' }, dotOnline: { backgroundColor: '#38A169' }, connectionText: { color: colors.muted, fontSize: 11 },
  readOnly: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.softCoral }, readOnlyText: { color: colors.danger, textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '700' }, errorBox: { padding: 9, backgroundColor: '#FFF0ED' }, error: { color: colors.danger, textAlign: 'center', fontSize: 12 },
  list: { paddingHorizontal: 14, paddingVertical: 16 }, loading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.background }, empty: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' }, emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 5 }, ownRow: { justifyContent: 'flex-start', flexDirection: 'row-reverse' }, avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.softCoral, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.coral, fontSize: 12, fontWeight: '900' }, bubble: { maxWidth: '78%', backgroundColor: colors.surface, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: colors.border }, ownBubble: { backgroundColor: colors.ink, borderColor: colors.ink, borderBottomLeftRadius: 18, borderBottomRightRadius: 5 }, senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }, sender: { color: colors.coral, fontSize: 11, fontWeight: '900' }, organizer: { color: colors.ink, fontSize: 8, fontWeight: '900', backgroundColor: colors.softGreen, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }, body: { color: colors.text, fontSize: 15, lineHeight: 20 }, ownBody: { color: '#FFFFFF' }, time: { color: colors.muted, fontSize: 9, textAlign: 'right', marginTop: 4 }, ownTime: { color: '#D8E3DF' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, input: { flex: 1, maxHeight: 110, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 11, color: colors.text, fontSize: 15 }, send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, sendText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' }, disabled: { opacity: 0.45 }, retry: { alignSelf: 'center', margin: 18, backgroundColor: colors.ink, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11 }, retryText: { color: '#FFFFFF', fontWeight: '900' },
});
