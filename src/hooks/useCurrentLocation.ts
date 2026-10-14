import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LocationPoint } from '../types/location';

/** Obtiene una ubicación a pedido. No suscribe seguimiento ni envía datos al backend. */
export function useCurrentLocation() {
  const [position, setPosition] = useState<LocationPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);
  const mounted = useRef(false);
  const locked = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function locate() {
    if (locked.current) return;
    locked.current = true;
    setLocating(true);
    setError(null);
    setNeedsSettings(false);
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) {
        setNeedsSettings(!permission.canAskAgain);
        setError('Puedes explorar el mapa sin permiso. Activa la ubicación para encontrar tu posición.');
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!mounted.current) return;
      if (!enabled) {
        setError('Activa la ubicación del dispositivo y vuelve a intentarlo.');
        return;
      }

      // Evita bloquear el botón si el dispositivo no consigue una señal GPS.
      const result = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('location-timeout')), 20_000);
        }),
      ]);
      if (!mounted.current) return;

      setPosition({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        capturedAt: result.timestamp,
      });
    } catch {
      if (mounted.current) setError('No pudimos obtener tu ubicación. Revisa la señal y vuelve a intentarlo.');
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      if (mounted.current) setLocating(false);
    }
  }

  return { position, locating, error, needsSettings, locate };
}
