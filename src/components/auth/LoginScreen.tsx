import { useEffect } from 'react';
import { router } from 'expo-router';
import { Button } from '../ui/Button';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { BrandMark } from '../ui/BrandMark';
import { colors } from '../ui/theme';

export function LoginScreen() {
  const { busy, error, login, clearError } = useAuth();
  useEffect(() => { clearError(); }, [clearError]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <BrandMark />
            <Text style={styles.tagline}>Planes reales, personas reales</Text>
            <View style={styles.hero}>
              <View style={styles.sun} />
              <View style={[styles.hill, styles.hillBack]} />
              <View style={[styles.hill, styles.hillFront]} />
              <View style={styles.people}>
                <View style={styles.person}><View style={styles.head} /><View style={styles.body} /></View>
                <View style={[styles.person, { transform: [{ scale: 1.08 }] }]}><View style={[styles.head, { backgroundColor: '#C96E58' }]} /><View style={[styles.body, { backgroundColor: colors.coral }]} /></View>
                <View style={styles.person}><View style={styles.head} /><View style={styles.body} /></View>
              </View>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Tu próximo plan empieza aquí.
            </Text>
            <Text style={styles.subtitle}>Accede a tu cuenta y descubre actividades cerca de ti.</Text>
            <LoginForm busy={busy} onSubmit={login} />
            <Button title="Crear cuenta" variant="secondary" disabled={busy} onPress={() => { clearError(); router.push('/register'); }} />
            {busy && <ActivityIndicator accessibilityLabel="Procesando" color="#1E5547" style={styles.feedback} />}
            {error && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            )}
            <Text style={styles.note}>Tu sesión se mantiene protegida durante 30 minutos.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  tagline: { color: colors.muted, fontSize: 14, marginTop: -2, marginLeft: 3, marginBottom: 18 },
  hero: { height: 128, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EDF2E9', marginBottom: 24 },
  sun: { position: 'absolute', top: 21, left: '50%', width: 28, height: 28, marginLeft: -14, borderRadius: 14, backgroundColor: colors.coral },
  hill: { position: 'absolute', borderRadius: 180, backgroundColor: '#BFD2BD' },
  hillBack: { width: 290, height: 120, left: -40, bottom: -76 },
  hillFront: { width: 300, height: 135, right: -70, bottom: -88, backgroundColor: '#86A98D' },
  people: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8 },
  person: { alignItems: 'center' }, head: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D7A178', marginBottom: -2, zIndex: 2 },
  body: { width: 48, height: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: colors.ink },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '800', color: colors.ink, marginBottom: 8, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted, marginBottom: 26 },
  feedback: { marginTop: 16 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21, marginTop: 16 },
  note: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 22, textAlign: 'center' },
});
