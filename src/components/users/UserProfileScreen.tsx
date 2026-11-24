import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { getPublicProfile, type PublicProfile } from '../../services/profiles';
import { ApiError } from '../../services/api';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/BrandMark';
import { colors } from '../ui/theme';

export function UserProfileScreen({ userId }: { userId: string }) {
  const { session, expireSession } = useAuth();
  const token = session?.token ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async (isActive: () => boolean) => {
    setError(''); setProfile(null);
    try { const result = await getPublicProfile(token, userId); if (isActive()) setProfile(result); }
    catch (e) { if (!isActive()) return; if (e instanceof ApiError && e.code === 'UNAUTHORIZED') expireSession(); setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.'); }
  }, [token, userId, expireSession]);
  useFocusEffect(useCallback(() => { let active = true; void load(() => active); return () => { active = false; }; }, [load]));
  return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content}>
    <Button title="‹ Volver" variant="secondary" onPress={() => router.back()} /><BrandMark compact />
    {error ? <><Text accessibilityRole="alert" style={s.error}>{error}</Text><Button title="Reintentar" onPress={() => { void load(() => true); }} /></> : !profile ? <ActivityIndicator color={colors.ink} /> : <>
      <View style={s.avatar}><Text style={s.initial}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View>
      <Text accessibilityRole="header" style={s.title}>{profile.displayName}</Text>
      <Text style={s.heading}>Acerca de mí</Text><Text style={s.bio}>{profile.bio || 'Todavía no agregó una descripción.'}</Text>
      <Text style={s.heading}>Intereses</Text><View style={s.interests}>{profile.interests.map(i => <Text key={i.id} style={s.chip}>{i.name}</Text>)}</View>
      {!profile.interests.length && <Text style={s.bio}>Todavía no agregó intereses.</Text>}
      {session?.user.id === profile.id && <Button title="Editar mi perfil" onPress={() => router.push('/profile')} />}
    </>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, gap: 18 }, avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.softGreen, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' }, initial: { color: colors.ink, fontWeight: '900', fontSize: 34 }, title: { color: colors.ink, fontWeight: '900', fontSize: 28, textAlign: 'center' }, heading: { color: colors.ink, fontWeight: '800', fontSize: 18 }, bio: { color: colors.muted, lineHeight: 23 }, interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { color: colors.ink, backgroundColor: colors.softGreen, borderRadius: 16, padding: 10 }, error: { color: colors.danger } });
