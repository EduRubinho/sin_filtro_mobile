# SinFiltro · Mobile

React Native + Expo SDK 57, TypeScript y Expo Router. Implementa login con roles, registro, perfil editable y mapa con ubicación puntual. Sesión de 30 minutos en memoria. Usa Apple Maps en iOS y Google Maps en Android; consulta actividades usando las coordenadas del centro del mapa, sin guardarlas como ubicación del usuario.

## Ejecutar

Requisitos: Node.js 24+, Expo Go, backend iniciado con el [esquema inicial de PostgreSQL](../backend/README.md#ejecutar) creado. Puedes crear tu cuenta desde la app.

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

Mobile mantiene una estructura sencilla de Expo Router; no utiliza arquitectura hexagonal:

```text
src/
├── app/                   rutas y protección por sesión/rol
├── components/
│   ├── activities/        mapa y publicación de actividades
│   ├── admin/             panel y formularios administrativos
│   ├── auth/              login, registro, onboarding y perfil
│   └── ui/                controles visuales reutilizables
├── hooks/                 estado React y efectos compartidos
├── services/              peticiones HTTP y validación de respuestas
├── types/                 contratos TypeScript por concepto
└── utils/                 transformaciones puras, sin React ni red
```

El flujo permitido es `app → components → hooks/services → api → backend`. `services` puede usar `types`, pero no componentes. Los elementos reutilizables no dependen de `admin`: formularios de usuario y administrador comparten `components/ui`. Los archivos de `app` se mantienen pequeños y solo conectan una URL con su pantalla.

Flujo protegido según el rol devuelto por el backend:

- `/`: mismo login para usuarios y administradores, sin selector de rol.
- `/register`: correo, contraseña de 8 a 64 caracteres y confirmación. Crea exclusivamente usuarios normales.
- `/onboarding`: nombre, biografía opcional y al menos dos intereses; guarda el perfil antes de entrar al mapa.
- `/map`, `/publish` y `/profile`: usuarios con perfil completo. Al entrar al mapa se solicita una lectura GPS y se centra la vista; si no está disponible, se usa Tacna como respaldo. El usuario publica una actividad abriendo un mapa completo, marca el punto y lo confirma antes de volver al formulario. Fecha y hora se eligen con controles nativos. «Mi perfil» permite editarlo y «Mi ubicación» vuelve a solicitar la lectura, sin seguimiento continuo.
- `/admin`: panel de administración con secciones Usuarios y Eventos; listados paginados, detalle, creación, edición, eliminación con confirmación y cierre de sesión. Asignar el rol desde el [backend](../backend/README.md#cuentas-y-roles).

No hay mascotas ni requisitos universitarios. El avatar muestra la inicial del nombre; la subida de fotos queda pendiente. El token se pierde al terminar el proceso de la app; el perfil permanece guardado en PostgreSQL. Una cuenta existente sin perfil completo pasa por onboarding al iniciar sesión.

Pendientes: recuperación de contraseña, inscripción en actividades, chat, PIN compartido del evento y álbumes. Los recuerdos cercanos tendrán un listado separado del mapa. Ver [modelo de datos y reglas](../backend/docs/database/README.md).

## Variables y Git

Solo se versiona `.env.example`, con valores de referencia. `.env` y sus variantes locales están ignorados; cada desarrollador configura su archivo. Las variables `EXPO_PUBLIC_*` son públicas y no deben contener secretos.

## Panel administrativo

Después del login, una cuenta `admin` entra directamente al panel. Requiere el backend con los endpoints administrativos `/users` y `/events` actualizados.

- Usuarios: solo cuentas `user`; permite crear correo/contraseña, consultar perfil, editar correo/contraseña y eliminar. No modifica roles ni perfiles desde este CRUD.
- Eventos: permite consultar y gestionar los eventos de usuarios. Al crear se selecciona un organizador activo y una categoría; el administrador no se inscribe ni se convierte en organizador. La ubicación se confirma en un mapa completo y el horario usa selectores nativos de calendario y hora.
- Los listados muestran 20 registros por página. Los errores y restricciones del backend aparecen en pantalla; borrar un evento conserva su historial y borrar un usuario con relaciones puede ser rechazado.

La inscripción en eventos por usuarios sigue pendiente; la publicación ya está disponible. Ver [contrato y ejemplos de la API](../backend/docs/admin-api.md).

## Actividades en el mapa

El mapa consulta `GET /activities/map` con la sesión y un radio de 5 km alrededor del centro. El círculo representa ese radio. Una nueva búsqueda se activa cuando el centro se desplaza al menos 750 m, con una espera de 450 ms tras terminar el movimiento. Los marcadores anteriores permanecen visibles durante la actualización. También se actualiza al volver a la pantalla/app, cada minuto en primer plano y con «Actualizar».

Solo se muestran actividades `published`, no eliminadas, cuya hora de fin no haya pasado. Tocando el marcador circular coral se ve título, categoría, lugar, inicio y precio. El marcador azul indica la ubicación obtenida del dispositivo. «Publicar actividad» abre el formulario del usuario; el backend toma el organizador de la sesión y la publica directamente. No hay inscripción ni botones de unirse todavía.

Para probar: publica una actividad desde la cuenta de usuario o crea un evento **Publicado** desde el panel administrativo, eligiendo un punto cercano en el mapa. Al volver al mapa principal se actualiza la búsqueda. Los borradores no aparecen. Se muestran hasta 100 actividades por búsqueda; si hay más, el mapa lo indica. No se requiere cambiar el esquema de la base.
