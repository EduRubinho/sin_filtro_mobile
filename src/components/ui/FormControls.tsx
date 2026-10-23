import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useStableSafeAreaInsets } from '../../hooks/useStableSafeAreaInsets';
import { colors, shadow } from './theme';
export const labels = { draft: 'Borrador', published: 'Publicado', completed: 'Finalizado', cancelled: 'Cancelado', active: 'Activo', suspended: 'Suspendido', deleted: 'Eliminado' };
export const formatDate = (value: string) => new Date(value).toLocaleString('es-PE');
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#727D78" style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} /></View>;
}
export function Choice({ label, selected = false, onPress, disabled = false }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[s.choice, selected && s.selected, disabled && { opacity: 0.5 }]}><Text style={[s.choiceText, selected && { color: '#FFFFFF' }]}>{label}</Text></Pressable>;
}
export function Sheet({ title, onClose, busy = false, children }: PropsWithChildren<{ title: string; onClose: () => void; busy?: boolean }>) {
  const insets = useStableSafeAreaInsets();
  return <Modal animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} onRequestClose={() => { if (!busy) onClose(); }}><View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={s.sheetHeader}><View><Text style={s.brand}>SINFILTRO · ADMIN</Text><Text accessibilityRole="header" style={s.title}>{title}</Text></View><Choice label="Cerrar" onPress={onClose} disabled={busy} /></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetBody}>{children}</ScrollView>
    </KeyboardAvoidingView>
  </View></Modal>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[s.note, error && s.error]}>{text}</Text>;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { padding: 20, paddingBottom: 12, gap: 8 },
  brand: { color: colors.coral, letterSpacing: 2, fontWeight: '900', fontSize: 11 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900', flexShrink: 1, letterSpacing: -0.5 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 21, marginVertical: 8 }, error: { color: colors.danger },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 10, minHeight: 42, justifyContent: 'center', backgroundColor: colors.surface },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink }, choiceText: { color: colors.ink, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: '#E8E4DC', padding: 18, marginBottom: 12, gap: 6, ...shadow },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 18 }, meta: { color: colors.muted, lineHeight: 21 },
  badge: { color: colors.coral, fontWeight: '800', fontSize: 12 },
  sheetHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  sheetBody: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 680, alignSelf: 'center' },
  field: { marginBottom: 16 }, label: { color: colors.text, fontWeight: '700', marginBottom: 7, fontSize: 14 },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, minHeight: 56, fontSize: 16 },
});
