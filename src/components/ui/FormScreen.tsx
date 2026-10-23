import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';
import { colors } from './theme';

export function FormScreen({ title, subtitle, progress = false, children }: PropsWithChildren<{ title: string; subtitle: string; progress?: boolean }>) {
  return (
    <SafeAreaView style={formStyles.safe}>
      <KeyboardAvoidingView style={formStyles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
          <View style={formStyles.card}>
            <BrandMark compact />
            {progress ? <View style={formStyles.progress}><View style={formStyles.progressActive} /><View style={formStyles.progressRest} /></View> : <View style={formStyles.brandSpacing} />}
            <Text accessibilityRole="header" style={formStyles.title}>{title}</Text>
            <Text style={formStyles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const formStyles = StyleSheet.create({
  fill: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 28, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  progress: { flexDirection: 'row', gap: 7, marginTop: 22, marginBottom: 30 },
  brandSpacing: { height: 30 },
  progressActive: { height: 5, width: 44, borderRadius: 5, backgroundColor: colors.coral },
  progressRest: { height: 5, width: 44, borderRadius: 5, backgroundColor: '#E4E2DC' },
  brand: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 28 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '800', marginBottom: 10, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 28 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 15,
    minHeight: 58, padding: 16, fontSize: 16, color: colors.text, marginBottom: 18 },
  note: { fontSize: 13, lineHeight: 20, color: colors.muted, marginBottom: 12 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21, marginVertical: 12 },
});
