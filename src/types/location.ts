/** Lectura puntual del dispositivo; accuracy está en metros y capturedAt en milisegundos. */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
}
