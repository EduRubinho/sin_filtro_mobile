# SinFiltro · Mobile

React Native + Expo SDK 57, TypeScript y Expo Router. Implementa login, sesión de 30 minutos en memoria y mapa con ubicación puntual. Usa Apple Maps en iOS y Google Maps en Android; no envía coordenadas al backend.

## Ejecutar

Requisitos: Node.js 24+, Expo Go, backend iniciado y una [cuenta existente](../backend/README.md#cuenta-local).

Desde la raíz del proyecto:

```sh
cd mobile
npm ci
```

Si no existe `.env`, copiar `cp .env.example .env`. Configurar `EXPO_PUBLIC_API_URL` según el dispositivo:

| Dispositivo | URL del backend |
| --- | --- |
| Simulador iOS | `http://localhost:3000` |
| Emulador Android Studio | `http://10.0.2.2:3000` |
| Teléfono en la misma red que la Mac | `http://IP_LOCAL_DE_LA_MAC:3000` |

Ejemplo:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Ejecutar `npm start` y escanear el QR con Expo Go en Android o la cámara del iPhone. Si cambia la red, revisar la IP. Al modificar `.env`, reiniciar con `npm start -- --clear`.

## Comandos

Desde `mobile`:

| Comando | Acción |
| --- | --- |
| `npm start` | Inicia Expo Go y muestra el QR. |
| `npm run ios` | Abre Expo Go en el simulador; requiere Xcode. |
| `npm run android` | Abre Expo Go en Android conectado o emulador; requiere dispositivo disponible. |
| `npm run typecheck` | Comprueba TypeScript. |
| `npm run lint` | Ejecuta ESLint. |
| `npm test` | Prueba los servicios de autenticación. |

Los scripts iOS/Android usan `expo start --go`; no compilan una app propia. Web no está validado.

## Estructura y alcance

`src/app`: rutas; `components`: interfaz; `hooks`: sesión y ubicación; `services`: API; `types`: tipos compartidos. Mobile no utiliza arquitectura hexagonal.

Rutas actuales: `/` (login) y `/map` (protegida). «Mi ubicación» pide permiso y obtiene una lectura; no hay seguimiento continuo. El token se pierde al terminar el proceso de la app.

Pendientes: registro móvil, actividades, chat, PIN compartido del evento y álbumes. Los recuerdos cercanos tendrán un listado separado del mapa. Ver [modelo de datos y reglas](../backend/docs/database/README.md).

## Variables y Git

Solo se versiona `.env.example`, con valores de referencia. `.env` y sus variantes locales están ignorados; cada desarrollador configura su archivo. Las variables `EXPO_PUBLIC_*` son públicas y no deben contener secretos.
