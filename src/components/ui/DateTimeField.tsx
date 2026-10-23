import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStableSafeAreaInsets } from '../../hooks/useStableSafeAreaInsets';
import { colors, shadow } from './theme';

type Mode = 'date' | 'time';
function validDate(value: string, minimumDate?: Date) { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed : minimumDate ?? new Date(); }
function mergePart(current: Date, selected: Date, mode: Mode) { const next = new Date(current); if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate()); else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0); return next; }

export function DateTimeField({ label, value, onChange, minimumDate, disabled = false }: { label: string; value: string; onChange: (iso: string) => void; minimumDate?: Date; disabled?: boolean }) {
  const insets = useStableSafeAreaInsets();
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, setPending] = useState(() => validDate(value, minimumDate));
  const date = validDate(value, minimumDate);
  const formatted = Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date) : 'Selecciona fecha y hora';
  const open = (nextMode: Mode) => { setPending(date); setMode(nextMode); };
  const changed = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) { if (Platform.OS === 'android') setMode(null); return; }
    const next = mergePart(date, selected, mode ?? 'date');
    if (Platform.OS === 'android') { onChange(next.toISOString()); setMode(null); } else setPending(next);
  };
  const picker = mode && <DateTimePicker value={Platform.OS === 'ios' ? pending : date} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={mode === 'date' ? minimumDate : undefined} onChange={changed} locale="es-PE" />;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.card}><Text style={styles.value}>{formatted}</Text><View style={styles.actions}>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => open('date')} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>Calendario</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => open('time')} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>Hora</Text></Pressable>
  </View></View>{Platform.OS === 'android' ? picker : <Modal visible={mode !== null} transparent animationType="fade" onRequestClose={() => setMode(null)}><View style={styles.overlay}><View style={[styles.dialog, { paddingBottom: 30 + insets.bottom }]}>
    <Text style={styles.dialogTitle}>{mode === 'date' ? `Fecha de ${label.toLocaleLowerCase()}` : `Hora de ${label.toLocaleLowerCase()}`}</Text>{picker}
    <View style={styles.dialogActions}><Pressable onPress={() => setMode(null)} style={styles.dialogButton}><Text style={styles.cancel}>Cancelar</Text></Pressable><Pressable onPress={() => { onChange(pending.toISOString()); setMode(null); }} style={styles.dialogButton}><Text style={styles.confirm}>Aceptar</Text></Pressable></View>
  </View></View></Modal>}</View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 }, label: { color: colors.text, fontWeight: '700', marginBottom: 7, fontSize: 14 }, card: { padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, gap: 12, ...shadow },
  value: { color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }, actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.softGreen, justifyContent: 'center', alignItems: 'center' }, actionText: { color: colors.ink, fontWeight: '800' }, disabled: { opacity: 0.5 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }, dialog: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 }, dialogTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 8 }, dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, dialogButton: { minWidth: 88, minHeight: 46, justifyContent: 'center', alignItems: 'center' }, cancel: { color: colors.muted, fontWeight: '700' }, confirm: { color: colors.coral, fontWeight: '900' },
});
