import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { Button } from './Button';

// Vista inicial de referencia; no representa la ubicación del usuario.
const INITIAL_REGION = {
  latitude: -12.0464,
  longitude: -77.0428,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function MapScreen() {
  const { session, busy, error: authError, checkSession, logout } = useAuth();
  const { position, locating, error, needsSettings, locate } = useCurrentLocation();
  const map = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || !position) return;
    map.current?.animateToRegion({
      latitude: position.latitude,
      longitude: position.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 500);
  }, [mapReady, position]);

  async function openSettings() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Ajustes', 'Abre los ajustes del dispositivo para permitir el acceso a tu ubicación.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.account}>
          <Text style={styles.brand}>SIN FILTRO</Text>
          <Text accessibilityRole="header" style={styles.title}>Tu Mapa</Text>
          <Text numberOfLines={1} style={styles.caption}>{session?.user.email}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={logout}
          style={[styles.logout, busy && styles.disabled]}
        >
          <Text style={styles.actionText}>Cerrar sesión</Text>
        </Pressable>
      </View>
      {busy && <ActivityIndicator accessibilityLabel="Procesando sesión" color="#1E5547" />}
      {authError && <Text accessibilityRole="alert" style={styles.authError}>{authError}</Text>}
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onMapReady={() => setMapReady(true)}
        showsMyLocationButton={false}
        showsCompass
        toolbarEnabled={false}
      >
        {position && (
          <Marker
            coordinate={position}
            title="Última ubicación obtenida"
            description={position.accuracy === null ? undefined : `Precisión aproximada: ${Math.round(position.accuracy)} m`}
            pinColor="#1E5547"
          />
        )}
      </MapView>
      <View style={styles.footer}>
        <Text style={styles.caption}>
          {position
            ? 'Ubicación obtenida. Pulsa el botón para actualizarla.'
            : 'Explora el mapa o encuentra tu ubicación. La vista inicial muestra Lima.'}
        </Text>
        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        <Button title={locating ? 'Buscando ubicación…' : 'Mi ubicación'} onPress={locate} disabled={locating} />
        {needsSettings && <Button title="Abrir ajustes" onPress={openSettings} variant="secondary" />}
        <Button title="Comprobar sesión" onPress={checkSession} disabled={busy} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F1' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  account: { flex: 1, gap: 4 },
  brand: { color: '#1E5547', letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  title: { color: '#192D27', fontSize: 28, fontWeight: '700' },
  caption: { color: '#5A655F', fontSize: 14, lineHeight: 20 },
  logout: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  actionText: { color: '#1E5547', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  map: { flex: 1 },
  footer: { paddingHorizontal: 20, paddingTop: 16 },
  error: { color: '#A12A24', fontSize: 14, lineHeight: 20, marginTop: 8 },
  authError: { color: '#A12A24', paddingHorizontal: 20, paddingBottom: 12 },
});
