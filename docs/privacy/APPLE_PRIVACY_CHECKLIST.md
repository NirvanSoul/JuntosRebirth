# APPLE_PRIVACY_CHECKLIST.md

> Checklist de publicación. Última actualización: 2026-08-30.

- [ ] **Privacy Policy URL** — pendiente de publicar `Legal/site/privacy.html` en `aoraestudio.com` (paso manual, generado por `npm run generate:legal-site`).
- [x] **App Privacy actualizado (declaración)** — inventario listo en `docs/privacy/DATA_INVENTORY.md` para rellenar App Store Connect; categorías aplicables hoy: _Financial Info_ (movimientos), _User Content_ (categorías/títulos), _Identifiers_ (id de usuario), _Contact Info_ (nombre/correo, solo con cuenta). No aplican: _Usage Data_, _Diagnostics_, _Purchases_, _Advertising Data_ (no hay analítica, IAP ni ads todavía).
- [x] **SDKs incluidos** — revisar `package.json` antes de cada publicación; no hay SDKs publicitarios o analíticos.
- [ ] **PrivacyInfo.xcprivacy válido** — declarado en `app.json` (`expo.ios.privacyManifests`), no a mano en `ios/` (esa carpeta es generada y está en `.gitignore`): el plugin de Expo escribe `PrivacyInfo.xcprivacy` y lo registra en el proyecto de Xcode en cada `expo prebuild`/build. Revisar el reporte de privacidad de Xcode tras compilar (los módulos nativos de Expo pueden añadir Required Reason APIs no cubiertos aquí).
- [ ] **Required Reason APIs** — declarado uso de `NSPrivacyAccessedAPICategoryUserDefaults` (razón `CA92.1`) por `expo-secure-store`/`AsyncStorage`/preferencias locales; confirmar con el build real de Xcode 15+ que no falta ninguna categoría.
- [ ] **SDK privacy manifests** — confirmar que los módulos nativos de Expo usados incluyen su propio `PrivacyInfo.xcprivacy` en la versión instalada.
- [x] **ATT si aplica** — no aplica hoy (no hay tracking ni SDKs de publicidad). Revisar de nuevo al integrar AdMob.
- [ ] **Eliminación dentro de la app** — implementada en `Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos` (`src/features/legal/screens/DataRightsScreen.tsx`); falta habilitarla end-to-end una vez exista registro real (hoy cubre el borrado local de invitado).
- [x] **Textos de permisos** — no se solicita ningún permiso con `NSUsageDescription` propio hoy (sin cámara/fotos/contactos/ubicación); notificaciones no requieren texto de `Info.plist` en iOS.
- [x] **Age rating** — audiencia objetivo definida: a partir de 14 años, sin contenido sensible, violento ni dirigido a menores. Declarar la clasificación correspondiente en App Store Connect.
- [x] **Anuncios declarados** — no aplica: no hay anuncios.
- [ ] **Documentos accesibles** — pendiente de publicar `Legal/site/*` en un dominio público (mismo bloqueo que la Privacy Policy URL).
