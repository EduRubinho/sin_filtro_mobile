import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from './LoginForm';

export function LoginScreen() {
  const { busy, error, login } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.brand}>SIN FILTRO</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Qué bueno verte.
            </Text>
            <Text style={styles.subtitle}>
              Inicia sesión con tu cuenta para continuar.
            </Text>
            <LoginForm busy={busy} onSubmit={login} />
            {busy && <ActivityIndicator accessibilityLabel="Procesando" color="#1E5547" style={styles.feedback} />}
            {error && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            )}
            <Text style={styles.note}>
              La sesión dura 30 minutos. Al cerrar la app, vuelve a iniciar sesión.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#F6F5F1' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  brand: { color: '#1E5547', letterSpacing: 3, fontSize: 13, fontWeight: '700', marginBottom: 32 },
  title: { fontSize: 34, fontWeight: '700', color: '#192D27', marginBottom: 12 },
  subtitle: { fontSize: 16, lineHeight: 24, color: '#5A655F', marginBottom: 32 },
  feedback: { marginTop: 16 },
  error: { color: '#A12A24', fontSize: 14, lineHeight: 21, marginTop: 16 },
  note: { fontSize: 12, lineHeight: 18, color: '#646E68', marginTop: 28 },
});
