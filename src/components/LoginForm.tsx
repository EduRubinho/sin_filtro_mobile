import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput } from 'react-native';
import type { Credentials } from '../types/auth';
import { Button } from './Button';

interface LoginFormProps {
  busy: boolean;
  onSubmit: (credentials: Credentials) => Promise<unknown>;
}

export function LoginForm({ busy, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordInput = useRef<TextInput>(null);

  async function submit() {
    if (busy) return;
    Keyboard.dismiss();
    const credentials = { email, password };
    setPassword('');
    await onSubmit(credentials);
  }

  return (
    <>
      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        accessibilityLabel="Correo electrónico"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        placeholder="tu@correo.com"
        placeholderTextColor="#777B83"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
        maxLength={254}
        returnKeyType="next"
        onSubmitEditing={() => passwordInput.current?.focus()}
        style={styles.input}
      />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        ref={passwordInput}
        accessibilityLabel="Contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        placeholder="Tu contraseña"
        placeholderTextColor="#777B83"
        value={password}
        onChangeText={setPassword}
        editable={!busy}
        maxLength={64}
        returnKeyType="go"
        onSubmitEditing={submit}
        style={styles.input}
      />
      <Button title={busy ? 'Ingresando…' : 'Iniciar sesión'} onPress={submit} disabled={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#263C33', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D1CA',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#192D27',
    marginBottom: 20,
  },
});
