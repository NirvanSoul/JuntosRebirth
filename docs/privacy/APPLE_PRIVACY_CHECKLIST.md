# APPLE_PRIVACY_CHECKLIST.md

> Checklist de publicación. Última actualización: 2026-10-16.

- [ ] **Privacy Policy URL** — pendiente de publicar `Legal/site/privacy.html` en `aoraestudio.com` (paso manual, generado por `npm run generate:legal-site`).
- [ ] **App Privacy actualizado (declaración)** — además de _Financial Info_, _User Content_, _Identifiers_ y _Contact Info_, declarar la analítica opcional de Microsoft Clarity: _Device ID_, _Product Interaction_ y _Performance Data_, sin vinculación a la cuenta, sin tracking y con finalidad de analítica. Confirmar el formulario final en App Store Connect antes de publicar.
- [x] **SDKs incluidos** — `@microsoft/react-native-clarity` presta analítica opcional; no hay SDKs publicitarios.
- [ ] **PrivacyInfo.xcprivacy válido** — declarado en `app.json` (`expo.ios.privacyManifests`), no a mano en `ios/` (esa carpeta es generada y está en `.gitignore`): el plugin de Expo escribe `PrivacyInfo.xcprivacy` y lo registra en el proyecto de Xcode en cada `expo prebuild`/build. Revisar el reporte de privacidad de Xcode tras compilar (los módulos nativos de Expo pueden añadir Required Reason APIs no cubiertos aquí).
- [ ] **Required Reason APIs** — declarado uso de `NSPrivacyAccessedAPICategoryUserDefaults` (razón `CA92.1`) por `expo-secure-store`/`AsyncStorage`/preferencias locales; confirmar con el build real de Xcode 15+ que no falta ninguna categoría.
- [ ] **SDK privacy manifests** — confirmar en el build real que Clarity y los módulos nativos de Expo incluyen o agregan correctamente sus declaraciones al reporte de privacidad de Xcode.
- [ ] **Clarity masking** — fijar el proyecto `yyk3h5w44v` en modo `Strict` desde el panel de Clarity y verificar una grabación de prueba antes de publicar; es una app financiera y el enmascarado no puede darse por confirmado desde el repositorio.
- [x] **ATT si aplica** — no aplica hoy (no hay tracking ni SDKs de publicidad). Revisar de nuevo al integrar AdMob.
- [ ] **Eliminación dentro de la app** — implementada en `Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos` (`src/features/legal/screens/DataRightsScreen.tsx`); falta habilitarla end-to-end una vez exista registro real (hoy cubre el borrado local de invitado).
- [x] **Textos de permisos** — no se solicita ningún permiso con `NSUsageDescription` propio hoy (sin cámara/fotos/contactos/ubicación); notificaciones no requieren texto de `Info.plist` en iOS.
- [x] **Age rating** — audiencia objetivo definida: a partir de 14 años, sin contenido sensible, violento ni dirigido a menores. Declarar la clasificación correspondiente en App Store Connect.
- [x] **Anuncios declarados** — no aplica: no hay anuncios.
- [ ] **Documentos accesibles** — pendiente de publicar `Legal/site/*` en un dominio público (mismo bloqueo que la Privacy Policy URL).
