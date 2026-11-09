import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useMapActivities } from '../../hooks/useMapActivities';
import { colors, shadow } from '../ui/theme';

const INITIAL_REGION = { latitude: -18.0066, longitude: -70.2463, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const MINIMUM_SEARCH_MOVEMENT_METERS = 750;
const activityImage = require('../../../assets/activity-volleyball.png');

function distanceInMeters(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function categorySymbol(name: string) {
  const value = name.toLocaleLowerCase();
  if (value.includes('música') || value.includes('musica')) return '♫';
  if (value.includes('café') || value.includes('cafe')) return '☕';
  if (value.includes('arte')) return '✦';
  return '●';
}

export function MapScreen() {
  const { session, error: authError } = useAuth();
  const { position, locating, error, needsSettings, locate } = useCurrentLocation();
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState({ latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { activities, loading, error: activitiesError, hasMore, refresh } = useMapActivities(center.latitude, center.longitude);
  const selected = activities.find(activity => activity.id === selectedId);

  useEffect(() => { void locate(); }, [locate]);
  useEffect(() => {
    if (!mapReady || !position) return;
    map.current?.animateToRegion({ latitude: position.latitude, longitude: position.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
  }, [mapReady, position]);

  async function openSettings() {
    try { await Linking.openSettings(); }
    catch { Alert.alert('Ajustes', 'Abre los ajustes del dispositivo para permitir el acceso a tu ubicación.'); }
  }

  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>SINFILTRO</Text>
          <Text accessibilityRole="header" style={styles.title}>¿Qué hacemos hoy?</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(session?.user.profile.displayName || session?.user.email || 'S').slice(0, 1).toUpperCase()}</Text></View>
      </View>
      <Text numberOfLines={1} style={styles.greeting}>Hola, {session?.user.profile.displayName || session?.user.email}</Text>
      <View style={styles.filters}>
        <View style={[styles.filter, styles.filterActive]}><Text style={styles.filterActiveText}>Hoy</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>5 km</Text></View>
        <View style={styles.filter}><Text style={styles.filterText}>{activities.length}{hasMore ? '+' : ''} actividades</Text></View>
      </View>
    </View>

    {(authError || activitiesError) && <View style={styles.topError}><Text accessibilityRole="alert" style={styles.errorText}>{authError || activitiesError}</Text></View>}
    <View style={styles.mapArea}>
      <MapView ref={map} style={styles.map} initialRegion={INITIAL_REGION} onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={region => {
          const latitude = Math.max(-90, Math.min(90, region.latitude));
          const longitude = ((region.longitude + 180) % 360 + 360) % 360 - 180;
          const next = { latitude, longitude };
          setCenter(current => distanceInMeters(current, next) < MINIMUM_SEARCH_MOVEMENT_METERS ? current : next);
        }} moveOnMarkerPress={false} showsMyLocationButton={false} showsCompass toolbarEnabled={false}>
        <Circle center={center} radius={5000} strokeColor="#123A312A" fillColor="#123A3108" strokeWidth={1} />
        {activities.map(activity => <Marker key={activity.id} identifier={`activity-${activity.id}`}
          coordinate={{ latitude: activity.latitude, longitude: activity.longitude }} title={activity.title} description={activity.locationName}
          tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }} onPress={() => setSelectedId(activity.id)}>
          <View style={[styles.activityMarker, selectedId === activity.id && styles.selectedMarker]}><Text style={styles.activityMarkerText}>{categorySymbol(activity.categoryName)}</Text></View>
        </Marker>)}
        {position && <Marker coordinate={position} title="Tu ubicación" description={position.accuracy === null ? undefined : `Precisión aproximada: ${Math.round(position.accuracy)} m`}>
          <View style={styles.userMarker}><View style={styles.userMarkerCore} /></View>
        </Marker>}
      </MapView>

      <View style={styles.mapTools}>
        <View pointerEvents="none" style={styles.mapStatus}>
          {loading ? <ActivityIndicator size="small" color={colors.ink} /> : <Text style={styles.mapStatusText}>{activities.length ? 'Actividades cercanas' : 'Explora moviendo el mapa'}</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Actualizar actividades" disabled={loading} onPress={refresh} style={[styles.refreshButton, loading && styles.disabled]}><Text style={styles.refreshText}>↻</Text></Pressable>
      </View>

      {selected && <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalle de ${selected.title}`} onPress={() => router.push(`/activity/${selected.id}`)} style={styles.activityCard}>
        <Image source={activityImage} style={styles.activityImage} resizeMode="cover" />
        <View style={styles.activityInfo}>
          <View style={styles.cardTop}><Text style={styles.category}>{selected.categoryName}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={event => { event.stopPropagation(); setSelectedId(null); }} hitSlop={10}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Text style={styles.activityTitle} numberOfLines={1}>{selected.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>◷  {new Date(selected.startsAt).toLocaleString('es-PE', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
          <Text style={styles.meta} numberOfLines={1}>⌖  {selected.locationName}</Text>
          <View style={styles.detailLink}><Text style={styles.price}>{selected.price === 0 ? 'Gratis' : `${selected.currency} ${selected.price.toFixed(2)}`}</Text><Text style={styles.detailText}>Ver detalle →</Text></View>
        </View>
      </Pressable>}

      {!selected && <Pressable accessibilityRole="button" disabled={locating} onPress={locate} style={[styles.locationButton, locating && styles.disabled]}><Text style={styles.locationText}>{locating ? 'Localizando…' : '⌖  Mi ubicación'}</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => router.push('/publish')} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><Text style={styles.createButtonText}>＋  Crear actividad</Text></Pressable>
      {needsSettings && <Pressable accessibilityRole="button" onPress={openSettings} style={styles.settingsButton}><Text style={styles.settingsText}>Abrir ajustes</Text></Pressable>}
      {error && <View style={styles.locationError}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text></View>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, backgroundColor: colors.background, zIndex: 2 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 2.2, marginBottom: 3 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.9 },
  greeting: { color: colors.muted, fontSize: 13, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.softCoral, borderWidth: 1, borderColor: '#F0D5CD', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.coral, fontWeight: '900', fontSize: 18 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 13 },
  filter: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.text, fontWeight: '700', fontSize: 13 }, filterActiveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  mapArea: { flex: 1, overflow: 'hidden' }, map: { flex: 1 },
  topError: { backgroundColor: '#FFF2EF', paddingHorizontal: 20, paddingVertical: 9 }, errorText: { color: colors.danger, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  activityMarker: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderWidth: 4, borderColor: '#FFFFFF', ...shadow },
  selectedMarker: { transform: [{ scale: 1.12 }], backgroundColor: colors.ink },
  activityMarkerText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  userMarker: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2F80ED44', alignItems: 'center', justifyContent: 'center' },
  userMarkerCore: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.blue, borderWidth: 3, borderColor: '#FFFFFF' },
  mapTools: { position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapStatus: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#FFFFFFEE', justifyContent: 'center', ...shadow },
  mapStatusText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  refreshButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFFEE', alignItems: 'center', justifyContent: 'center', ...shadow }, refreshText: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  activityCard: { position: 'absolute', left: 14, right: 14, bottom: 82, height: 126, borderRadius: 22, padding: 10, backgroundColor: colors.surface, flexDirection: 'row', gap: 12, overflow: 'hidden', ...shadow },
  activityImage: { width: 112, height: 106, borderRadius: 16, backgroundColor: colors.softGreen },
  activityInfo: { flex: 1, paddingVertical: 2 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { color: colors.coral, fontWeight: '800', fontSize: 12 }, closeText: { color: colors.muted, fontSize: 26, lineHeight: 26 },
  activityTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginBottom: 4 }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18 }, price: { color: colors.ink, fontWeight: '800', fontSize: 12, marginTop: 2 },
  detailLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detailText: { color: colors.coral, fontSize: 12, fontWeight: '900', marginTop: 2 },
  locationButton: { position: 'absolute', left: 14, bottom: 16, height: 48, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: '#FFFFFFF2', ...shadow },
  locationText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  createButton: { position: 'absolute', right: 14, bottom: 16, height: 54, borderRadius: 27, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: colors.ink, ...shadow },
  createButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  settingsButton: { position: 'absolute', top: 54, right: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, backgroundColor: '#FFFFFFEE' }, settingsText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  locationError: { position: 'absolute', top: 54, left: 14, right: 14, padding: 9, borderRadius: 12, backgroundColor: '#FFF2EFF2' },
  disabled: { opacity: 0.5 }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
