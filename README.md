# juntoss

> **Versión alpha.** El proyecto está en desarrollo activo y todavía le faltan funcionalidades del roadmap (ver [`Bible/ROADMAP.md`](./Bible/ROADMAP.md)). No es una versión estable ni lista para producción.

Base de la reconstrucción móvil de `juntoss`, creada con React Native, Expo y TypeScript para iOS y Android. La etapa actual utiliza Expo SDK 54 para poder probar el mismo QR mediante Expo Go en dispositivos físicos.

La documentación de producto y arquitectura vive en [`Bible/`](./Bible/README.md) y debe leerse antes de modificar código. No se duplican esas reglas en este archivo.

## Requisitos

- Node.js 22 LTS o posterior.
- npm 10 o posterior.
- Xcode para compilar iOS.
- Android Studio y JDK 17 para compilar Android.

## Primer arranque

```sh
cp .env.example .env
npm install
npm run start
```

Instala Expo Go en iOS o Android y escanea el QR mostrado. El ordenador y el teléfono deben compartir la misma red local.

Si la red local bloquea la conexión, o si quieres compartir la app con personas que no están en tu misma red wifi, usa el túnel:

```sh
npm run tunnel
```

Expo levanta un túnel público con ngrok (`@expo/ngrok` ya está instalado como dependencia de desarrollo) y muestra un QR con una URL `exp://...exp.direct`. Cualquiera con Expo Go puede escanearlo desde otra red o desde otra ciudad, mientras tu terminal siga abierta. La URL cambia en cada arranque.

El túnel gratuito de Expo es compartido y a veces rechaza la conexión con `failed to start tunnel / remote gone away`. Es un fallo transitorio: `scripts/tunnel.sh` libera el puerto 8081, protege el cliente de ngrok frente a respuestas locales incompletas y reintenta hasta 5 veces. Puedes ajustarlo con `TUNNEL_ATTEMPTS`, `TUNNEL_RETRY_DELAY` y `RCT_METRO_PORT`. Si aun así no arranca, revisa [el estado de ngrok](https://status.ngrok.com/) y usa `npm run start:lan` mientras tanto.

Los comandos `ios` y `android` intentan abrir Expo Go en el simulador o emulador correspondiente. Las compilaciones nativas mediante Expo CNG se retomarán cuando el proyecto vuelva a development builds.

## Comandos

```sh
npm run start        # Expo Go mediante red local y QR
npm run dev          # alias de start
npm run start:lan    # Expo Go mediante red local
npm run tunnel       # Expo Go mediante ngrok (acceso desde fuera de tu wifi)
npm run start:tunnel # alias de tunnel
npm run typecheck
npm run lint
npm run format:check
npm test
npm run validate     # todas las validaciones anteriores
```

## Estructura actual

```text
src/
├── app/
├── components/
│   ├── layout/
│   ├── navigation/
│   └── overlays/
├── features/
│   ├── activity/
│   ├── dashboard/
│   └── map/
├── lib/
│   └── currency/
├── navigation/
└── theme/
```

La aplicación dispone de navegación inferior entre Inicio, Actividad y Mapa. El botón flotante global permite crear un ingreso, un gasto o una categoría. Categorías y movimientos se conservan localmente en SQLite. Ya existe el esquema remoto, el cliente y la migración local-nube idempotente; su activación desde la interfaz espera al flujo de registro e inicio de sesión.

## Variables de entorno

Solo las variables con prefijo `EXPO_PUBLIC_` llegan al bundle y, por tanto, son públicas. Nunca deben contener secretos. `.env.example` documenta los nombres admitidos; los archivos `.env*` locales no se versionan.

Para conectar un proyecto Supabase añade su Project URL y su publishable key.
No uses una `service_role` key en la app:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Las migraciones viven en `supabase/migrations/` y las pruebas pgTAP en
`supabase/tests/`. Con Docker y Supabase CLI disponibles se ejecutan mediante
`supabase start`, `supabase db reset` y `supabase test db`.
