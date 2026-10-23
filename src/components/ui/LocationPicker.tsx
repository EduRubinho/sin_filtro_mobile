import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useStableSafeAreaInsets } from '../../hooks/useStableSafeAreaInsets';
import { colors, shadow } from './theme';

export interface SelectedLocation { latitude: number; longitude: number }
const TACNA = { latitude: -18.0066, longitude: -70.2463 };

export function LocationPicker({ value, onChange, disabled = false }: { value: SelectedLocation | null; onChange: (location: SelectedLocation) => void; disabled?: boolean }) {
  const insets = useStableSafeAreaInsets();
  const map = useRef<MapView>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [mapSession, setMapSession] = useState(0);
  const [pending, setPending] = useState<SelectedLocation | null>(null);
  const { position, locating, error, locate } = useCurrentLocation();
  useEffect(() => { if (open && !pending) void locate(); }, [open, pending, locate]);
  useEffect(() => {
    if (!open || !ready || pending || !position) return;
    map.current?.animateToRegion({ ...position, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 450);
  }, [open, ready, pending, position]);
  const show = () => { if (!disabled) { setPending(value); setReady(false); setMapSession(current => current + 1); setOpen(true); } };
  const close = () => setOpen(false);
  const initial = pending ?? value ?? TACNA;
  return <View style={styles.field}>
    <Text style={styles.label}>Ubicación</Text>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={show} style={[styles.openButton, disabled && styles.disabled]}>
      <View style={styles.buttonIcon}><Text style={styles.buttonIconText}>⌖</Text></View><View style={styles.buttonCopy}>
        <Text style={styles.openTitle}>{value ? 'Ubicación seleccionada' : 'Seleccionar en el mapa'}</Text>
        <Text style={styles.openHelp}>{value ? 'Toca para verla o cambiarla' : 'Abre el mapa completo y marca el punto de encuentro'}</Text>
      </View><Text style={styles.chevron}>›</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false} onRequestClose={close}>
      <View style={styles.screen}><View style={[styles.header, { minHeight: 78 + insets.top, paddingTop: insets.top }]}>
        <Pressable accessibilityRole="button" onPress={close} style={styles.headerButton}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
        <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Punto de encuentro</Text><Text style={styles.subtitle}>{pending ? 'Punto listo para confirmar' : 'Toca el mapa para colocar el marcador'}</Text></View>
        <Pressable accessibilityRole="button" disabled={!pending} onPress={() => { if (pending) { onChange(pending); close(); } }} style={[styles.headerButton, !pending && styles.disabled]}><Text style={styles.acceptText}>Aceptar</Text></Pressable>
      </View><View style={styles.mapArea}>
        <MapView key={mapSession} ref={map} style={styles.map} initialRegion={{ ...initial, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
          onMapReady={() => setReady(true)} onPress={(event: MapPressEvent) => setPending(event.nativeEvent.coordinate)} toolbarEnabled={false} moveOnMarkerPress={false}>
          {pending && <Marker coordinate={pending} title="Punto de encuentro" anchor={{ x: 0.5, y: 0.5 }}><View style={styles.selectedMarker}><Text style={styles.markerText}>✦</Text></View></Marker>}
          {position && <Marker coordinate={position} title="Tu ubicación" pinColor="#2979C8" />}
        </MapView>
        <View style={styles.tip}><Text style={styles.tipText}>{pending ? 'Puedes mover el punto tocando otro lugar.' : 'Toca cualquier lugar del mapa para seleccionarlo.'}</Text></View>
        <Pressable accessibilityRole="button" disabled={locating} onPress={() => { if (position) { setPending(position); map.current?.animateToRegion({ ...position, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 350); } else void locate(); }} style={[styles.gpsButton, { bottom: 24 + insets.bottom }, locating && styles.disabled]}>
          <Text style={styles.gpsText}>{locating ? 'Buscando GPS…' : '⌖  Mi ubicación'}</Text>
        </Pressable>
        {error && <View style={[styles.errorBox, { bottom: 86 + insets.bottom }]}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: 18 }, label: { color: colors.text, fontWeight: '700', marginBottom: 7, fontSize: 14 },
  openButton: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: colors.softCoral, borderWidth: 1, borderColor: '#F2D9D0', borderRadius: 18 },
  buttonIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }, buttonIconText: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  buttonCopy: { flex: 1 }, openTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, openHelp: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }, chevron: { color: colors.ink, fontSize: 30 }, disabled: { opacity: 0.5 },
  screen: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 78, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  headerButton: { minWidth: 72, minHeight: 48, justifyContent: 'center', alignItems: 'center' }, heading: { flex: 1, alignItems: 'center' }, title: { color: colors.ink, fontSize: 18, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, secondaryText: { color: colors.muted, fontWeight: '700' }, acceptText: { color: colors.coral, fontWeight: '900' },
  mapArea: { flex: 1 }, map: { flex: 1 }, selectedMarker: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderWidth: 5, borderColor: '#FFFFFF', ...shadow }, markerText: { color: '#FFFFFF', fontSize: 29, fontWeight: '900' },
  tip: { position: 'absolute', top: 14, left: 16, right: 16, backgroundColor: '#FFFFFFEE', padding: 12, borderRadius: 16, alignItems: 'center', ...shadow }, tipText: { color: colors.text, fontWeight: '700', textAlign: 'center' },
  gpsButton: { position: 'absolute', right: 16, bottom: 24, minHeight: 52, borderRadius: 26, paddingHorizontal: 18, backgroundColor: colors.ink, justifyContent: 'center', ...shadow }, gpsText: { color: '#FFFFFF', fontWeight: '800' },
  errorBox: { position: 'absolute', left: 16, right: 16, bottom: 86, backgroundColor: '#FFF5F3EE', borderRadius: 12, padding: 10 }, error: { color: '#A12A24', textAlign: 'center', lineHeight: 19 },
});
