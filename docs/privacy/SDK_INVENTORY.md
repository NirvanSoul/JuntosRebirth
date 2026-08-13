# SDK_INVENTORY.md

> Inventario de SDKs y dependencias con impacto en privacidad. Última auditoría: 2026-08-07 (basada en `package.json`, `app.json`, `ios/juntoss/Info.plist`; no existe carpeta `android/` en el repositorio, Expo la genera en build).

## Instalados y en uso

### Supabase (`@supabase/supabase-js`)

- Package: `@supabase/supabase-js`
- Propósito: autenticación y base de datos cuando el usuario crea una cuenta.
- Datos: perfil, movimientos, categorías, espacios, sesión.
- Tracking: no.
- Ads: no.
- Privacy manifest: n/a (paquete JS, no SDK nativo con manifest propio).
- Data Safety docs: https://supabase.com/privacy
- DPA: LEGAL_REVIEW_REQUIRED (confirmar el acuerdo de tratamiento de datos vigente con Supabase).
- Región: LEGAL_REVIEW_REQUIRED (`EXPO_PUBLIC_SUPABASE_URL` está vacío en `.env.example`; confirmar región del proyecto real).
- Licencia: MIT.
- Revisado: 2026-08-07.

### expo-notifications

- Propósito: recordatorios locales de gastos/ingresos y aviso diario. Solo notificaciones **locales**: no hay integración con Firebase Cloud Messaging ni servidor de push remoto.
- Datos: puede incluir importe/categoría/título en el texto si el usuario no desactiva "Mostrar importes en notificaciones" (`Ajustes → Privacidad y datos → Preferencias de privacidad`).
- Tracking: no.
- Ads: no.
- Privacy manifest: cubierto por `PrivacyInfo.xcprivacy` (ver checklist Apple).
- Licencia: MIT.
- Revisado: 2026-08-07.

### expo-clipboard

- Propósito: copiar el correo de contacto del desarrollador al portapapeles desde `Ajustes → Ayuda → Contactar con el desarrollador`.
- Datos: no lee el portapapeles ni copia datos del usuario, solo escribe una dirección de correo fija de la app.
- Tracking: no. Ads: no.
- Licencia: MIT.
- Revisado: 2026-08-07.

### expo-secure-store / @react-native-async-storage/async-storage / expo-sqlite

- Propósito: almacenamiento local (sesión cifrada, catálogo de espacios, movimientos/categorías del modo invitado y sincronizados).
- Datos: todos los descritos en `DATA_INVENTORY.md`, en el dispositivo.
- Tracking: no. Ads: no.
- Licencias: MIT (los tres).
- Revisado: 2026-08-07.

## No instalados hoy

Confirmado por auditoría de `package.json`: no hay analítica (Amplitude, Mixpanel, Segment, PostHog, Firebase Analytics), crash reporting (Sentry, Bugsnag, Crashlytics) ni SDKs de publicidad.

## Planeado, no integrado: Google AdMob

El usuario del producto ha confirmado que se integrará **Google AdMob** (`react-native-google-mobile-ads`) más adelante. No se instala en esta tarea porque no hay ninguna superficie de anuncios en la app todavía: añadir el SDK sin uso real violaría la regla de "sin sobrecargar la app" y la de no instalar dependencias sin necesidad (`Bible/PROJECT_RULES.md` §9).

Plan de integración a ejecutar cuando se añadan anuncios (Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md §§27-30):

1. Instalar `react-native-google-mobile-ads`, evaluando su capa de consentimiento (UMP) en vez de construir una CMP propia.
2. Si hay usuarios en EEE/Reino Unido/Suiza: la CMP debe estar certificada e integrada con IAB TCF antes de pedir anuncios personalizados.
3. Flujo de arranque: actualizar estado de consentimiento → ¿requiere mensaje? → mostrar CMP si aplica → determinar si pueden pedirse anuncios → inicializar Mobile Ads → mostrar el formato permitido. La funcionalidad esencial de Juntos debe seguir disponible si el usuario rechaza anuncios personalizados.
4. Añadir `NSUserTrackingUsageDescription` en `Info.plist` e implementar App Tracking Transparency **solo si** AdMob o alguno de sus mediadores hace tracking según la definición de Apple.
5. Actualizar antes de publicar el cambio: este archivo, `docs/privacy/DATA_INVENTORY.md`, la Política de privacidad (`src/features/legal/content/privacyPolicy.ts`, sección 14), Google Play Data Safety y Apple App Privacy.
6. Añadir la fila de preferencia de anuncios personalizados en `PrivacyChoicesScreen` (`src/features/legal/screens/PrivacyChoicesScreen.tsx`) — hoy no existe porque no hay nada que activar/desactivar todavía (regla "no mostrar filas sin funcionalidad real").

Regla de release aplicable a partir de ese momento:

```text
Cambio de SDK/datos → DATA_INVENTORY → Política → Google Data Safety → Apple App Privacy → Release
```

## Fuente secundaria consultada

`Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md` §28 investigó `invertase/react-native-google-mobile-ads` (https://github.com/invertase/react-native-google-mobile-ads) como wrapper de referencia; confirmar versión y cobertura de UMP en el momento de integrarlo, no asumir que sigue igual que en esta auditoría.
