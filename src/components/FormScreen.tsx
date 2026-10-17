import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function FormScreen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={formStyles.safe}>
      <KeyboardAvoidingView style={formStyles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
          <View style={formStyles.card}>
            <Text style={formStyles.brand}>SinFiltro</Text>
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
  fill: { flex: 1 }, safe: { flex: 1, backgroundColor: '#F6F5F1' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brand: { color: '#1E5547', fontSize: 28, fontWeight: '800', letterSpacing: -1, marginBottom: 28 },
  title: { color: '#192D27', fontSize: 32, fontWeight: '700', marginBottom: 10 },
  subtitle: { color: '#5A655F', fontSize: 16, lineHeight: 24, marginBottom: 28 },
  label: { color: '#263C33', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#C9D1CA', borderWidth: 1, borderRadius: 14,
    minHeight: 54, padding: 14, fontSize: 16, color: '#192D27', marginBottom: 18 },
  note: { fontSize: 13, lineHeight: 20, color: '#5A655F', marginBottom: 12 },
  error: { color: '#A12A24', fontSize: 14, lineHeight: 21, marginVertical: 12 },
});
