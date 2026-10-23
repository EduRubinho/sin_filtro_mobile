import { useEffect, useState } from 'react';
import { Keyboard, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { FormScreen, formStyles as styles } from '../ui/FormScreen';

export function RegisterScreen() {
  const { register, busy, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  useEffect(() => { clearError(); }, [clearError]);

  async function submit() {
    if (busy) return;
    setValidation(null);
    if (password !== confirmation) { setValidation('Las contraseñas no coinciden.'); return; }
    if (password.length < 8 || password.length > 64) { setValidation('La contraseña debe tener entre 8 y 64 caracteres.'); return; }
    Keyboard.dismiss();
    const credentials = { email, password };
    setPassword(''); setConfirmation('');
    await register(credentials);
  }

  return (
    <FormScreen title="Crea tu cuenta" subtitle="Registra tus datos de forma segura para empezar." progress>
      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput style={styles.input} accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail}
        placeholder="tu@correo.com" placeholderTextColor="#777B83" keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} editable={!busy} />
      <Text style={styles.label}>Contraseña</Text>
      <TextInput style={styles.input} accessibilityLabel="Contraseña" value={password} onChangeText={setPassword}
        placeholder="Entre 8 y 64 caracteres" placeholderTextColor="#777B83" secureTextEntry autoCapitalize="none"
        autoCorrect={false} autoComplete="new-password" maxLength={64} editable={!busy} />
      <Text style={styles.label}>Confirmar contraseña</Text>
      <TextInput style={styles.input} accessibilityLabel="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation}
        placeholder="Repite tu contraseña" placeholderTextColor="#777B83" secureTextEntry autoCapitalize="none"
        autoCorrect={false} autoComplete="new-password" maxLength={64} editable={!busy} returnKeyType="go" onSubmitEditing={submit} />
      {(validation || error) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{validation || error}</Text>}
      <Button title={busy ? 'Creando cuenta…' : 'Continuar'} onPress={submit} disabled={busy} />
      <Button title="Ya tengo una cuenta" variant="secondary" disabled={busy} onPress={() => { clearError(); router.back(); }} />
    </FormScreen>
  );
}
