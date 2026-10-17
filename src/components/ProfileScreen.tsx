import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { getCategories } from '../services/auth';
import type { Category } from '../types/auth';
import { Button } from './Button';
import { FormScreen, formStyles } from './FormScreen';

const symbols: Record<string, string> = { deporte: '◉', musica: '♫', cafe: '☕', arte: '✧' };

export function ProfileScreen({ onboarding = false }: { onboarding?: boolean }) {
  const { session, saveProfile, busy, error, clearError, logout } = useAuth();
  const [displayName, setDisplayName] = useState(session?.user.profile.displayName ?? '');
  const [bio, setBio] = useState(session?.user.profile.bio ?? '');
  const [interestIds, setInterestIds] = useState<string[]>(session?.user.profile.interestIds ?? []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { clearError(); }, [clearError]);
  useEffect(() => {
    let active = true;
    void getCategories().then(values => {
      if (active) {
        setCategories(values);
        setInterestIds(current => current.filter(id => values.some(value => value.id === id)));
        if (values.length < 2) setLoadError('Todavía no hay suficientes intereses disponibles. Vuelve a intentarlo más tarde.');
      }
    }).catch(() => { if (active) setLoadError('No pudimos cargar los intereses. Revisa tu conexión e inténtalo otra vez.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const toggle = useCallback((id: string) => {
    setInterestIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }, []);

  async function submit() {
    Keyboard.dismiss();
    const saved = await saveProfile({ displayName, bio, interestIds });
    if (saved && !onboarding) router.replace('/map');
  }

  return (
    <FormScreen title={onboarding ? 'Hazlo a tu manera.' : 'Tu perfil.'}
      subtitle={onboarding ? 'Cuéntanos un poco de ti para empezar a conocer gente con tus mismos intereses.' : 'Así te presentas. Puedes cambiar tu nombre, biografía e intereses.'}>
      <View style={styles.avatar}><Text style={styles.initial}>{displayName.trim().slice(0, 1).toLocaleUpperCase() || 'S'}</Text></View>
      <Text style={formStyles.label}>¿Cómo te llamas?</Text>
      <TextInput style={formStyles.input} accessibilityLabel="Nombre" value={displayName} onChangeText={setDisplayName}
        placeholder="Tu nombre" placeholderTextColor="#777B83" autoCapitalize="words" maxLength={80} editable={!busy} />
      <Text style={formStyles.label}>Sobre ti <Text style={styles.optional}>(opcional)</Text></Text>
      <TextInput style={[formStyles.input, styles.bio]} accessibilityLabel="Biografía" value={bio} onChangeText={setBio}
        placeholder="Un poco de ti y de los planes que disfrutas" placeholderTextColor="#777B83"
        multiline maxLength={500} textAlignVertical="top" editable={!busy} />
      <Text style={formStyles.label}>¿Qué te gusta hacer?</Text>
      <Text style={formStyles.note}>Selecciona al menos dos intereses · {interestIds.length} seleccionados</Text>
      {loading && <ActivityIndicator color="#1E5547" accessibilityLabel="Cargando intereses" />}
      {loadError && <><Text style={formStyles.error} accessibilityRole="alert">{loadError}</Text>
        <Button title="Reintentar" variant="secondary" onPress={() => { setLoading(true); setLoadError(null); setAttempt(value => value + 1); }} /></>}
      <View style={styles.interests}>
        {categories.map(category => {
          const selected = interestIds.includes(category.id);
          return <Pressable key={category.id} accessibilityRole="checkbox" accessibilityLabel={category.name}
            accessibilityState={{ checked: selected, disabled: busy || loading }} disabled={busy || loading}
            onPress={() => toggle(category.id)} style={[styles.chip, selected && styles.selected]}>
            <Text style={[styles.chipText, selected && styles.selectedText]}>{symbols[category.slug] ?? '✦'}  {category.name} {selected ? '✓' : ''}</Text>
          </Pressable>;
        })}
      </View>
      {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={formStyles.error}>{error}</Text>}
      <Button title={busy ? 'Guardando…' : onboarding ? 'Explorar el mapa' : 'Guardar cambios'}
        onPress={submit} disabled={busy || loading || !!loadError || !displayName.trim() || interestIds.length < 2} />
      {onboarding
        ? <Button title="Cerrar sesión" variant="secondary" disabled={busy} onPress={logout} />
        : <Button title="Volver al mapa" variant="secondary" disabled={busy} onPress={() => router.replace('/map')} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5EDE5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  initial: { color: '#1E5547', fontWeight: '700', fontSize: 28 },
  optional: { color: '#5A655F', fontWeight: '400' }, bio: { minHeight: 96 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 24 },
  chip: { minHeight: 48, minWidth: '45%', flexGrow: 1, borderRadius: 24, borderWidth: 1, borderColor: '#C9D1CA', padding: 14, alignItems: 'center' },
  selected: { backgroundColor: '#1E5547', borderColor: '#1E5547' },
  chipText: { color: '#263C33', fontWeight: '600', fontSize: 15 }, selectedText: { color: '#FFFFFF' },
});
