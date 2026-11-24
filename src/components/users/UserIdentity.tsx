import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../ui/theme';

/** Un solo acceso al perfil para avatar y nombre; no consulta la API por cada instancia. */
export function UserIdentity({ userId, name, size = 42, showName = true, showAvatar = true, subtitle, style, nameStyle }: {
  userId: string; name: string; size?: number; showName?: boolean; showAvatar?: boolean;
  subtitle?: ReactNode; style?: StyleProp<ViewStyle>; nameStyle?: StyleProp<TextStyle>;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${name}`} onPress={() => router.push(`/users/${userId}`)}
    style={({ pressed }) => [s.row, style, pressed && { opacity: 0.65 }]}>
    {showAvatar && <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[s.initial, { fontSize: Math.round(size * 0.4) }]}>{name.trim().slice(0, 1).toUpperCase() || '?'}</Text></View>}
    {showName && <View style={s.copy}><Text style={[s.name, nameStyle]}>{name}</Text>{subtitle}</View>}
  </Pressable>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, minWidth: 44 }, avatar: { backgroundColor: colors.softGreen, justifyContent: 'center', alignItems: 'center' }, initial: { color: colors.ink, fontWeight: '800' }, copy: { flexShrink: 1, gap: 4 }, name: { color: colors.text, fontSize: 16, fontWeight: '800' } });
