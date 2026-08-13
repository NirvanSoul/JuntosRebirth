# Handoff: Flujo de onboarding de juntoss

Este documento es para que otro agente de IA continúe exactamente donde se
quedó esta sesión. El plan completo y aprobado vive en:

`/Users/alanalphonzo/.claude/plans/encapsulated-rolling-mountain.md`

**Léelo primero.** Contiene el contexto de producto completo (qué pantallas
construir, qué copy usar, por qué se tomó cada decisión de diseño técnico) y
la lista completa de archivos nuevos/editados con su propósito. Este handoff
solo resume el progreso y lo que falta, no repite ese contexto.

También son relevantes, ya leídos y usados durante la investigación:

- `Bible/JUNTOSS_ONBOARDING_GUIDE.md` — spec de copy y estructura del onboarding.
- `Bible/PRODUCT.md` §7 — reglas de producto del onboarding.
- `Bible/DECISIONS.md` ADR-012 — límite de láminas.
- `Bible/DATABASE.md` — historial de migraciones locales (llegar hasta "versión 16" en prosa; el código real iba en versión 15 antes de esta sesión).
- `Bible/ARCHITECTURE.md` — convenciones de carpetas por feature.

## Estado: qué ya está hecho (verificado con `tsc --noEmit` y `jest`, todo en verde)

1. **Migración SQLite `local_profile.display_name`** — hecho.
   - `src/lib/storage/localDatabase.ts`: `localDatabaseVersion` 15 → 16, bloque
     `if (currentVersion < 16) { ALTER TABLE local_profile ADD COLUMN display_name TEXT; }` añadido.
   - `src/features/profile/types.ts`: `LocalProfile` ahora tiene `displayName: string | null`.
   - `src/features/profile/repositories/localProfileRepository.ts`: `getLocalProfile`
     lee `display_name`; nueva función `saveLocalProfileDisplayName(displayName)`
     que hace `INSERT ... ON CONFLICT DO UPDATE` y vuelve a leer con `getLocalProfile()`
     (igual que se corrigió `saveLocalProfileAvatar` para no pisar el otro campo).
   - Tests actualizados: `localProfileRepository.test.ts`,
     `src/features/settings/screens/SettingsScreen.test.tsx` (mocks con `displayName: null`),
     `src/navigation/MainTabsNavigator.test.tsx` (mock igual).
   - **Pendiente dentro de esta pieza**: actualizar `Bible/DATABASE.md` con el
     párrafo de la "versión 16" (ver plan, §"Actualización de la Biblia").

2. **`src/lib/text/normalizeSearchText.ts`** — hecho, con test.
   - Extraído de `currencyCatalog.ts` (que ahora lo importa).
   - **Importante — bug de herramientas descubierto en esta sesión**: escribir
     un literal regex `̀-ͯ` (rango de marcas diacríticas combinadas)
     mediante las herramientas Write/Edit hace que la secuencia de escape se
     decodifique/corrompa antes de llegar al archivo (los bytes reales no
     coinciden con lo que se pretende escribir). Por eso esta función NO usa
     un regex con ese rango: en vez de `.replace(/[̀-ͯ]/g, '')`
     usa `Array.from(...).filter(...)` comparando `codePointAt(0)` contra las
     constantes numéricas `0x0300`/`0x036f` (literales hexadecimales, no
     escapes de string, así que no sufren el problema). **Si necesitas escribir
     cualquier literal `\uXXXX` dentro de un string/regex en este repo, evita
     las herramientas Edit/Write directamente y usa Bash con un script Python
     (`open(path, 'w', encoding='utf-8').write(...)`) o la técnica de
     constantes numéricas de arriba.** Ya se resolvió para este caso concreto,
     pero puede volver a aparecer si algún componente nuevo necesita otro
     rango unicode literal.

3. **`src/lib/geography/countryCatalog.ts`** — hecho, con test (`countryCatalog.test.ts`, 9 tests en verde).
   - 34 países derivados de `currencyCatalog.countries`, excluyendo la entrada
     agregada `'Unión Europea'`.
   - Mapa `countryIso2ByName` hardcodeado (currencyCatalog solo tiene nombres,
     no ISO2).
   - `getCountryFlag(iso2)` calcula el emoji de bandera por aritmética de
     codepoints (símbolos indicadores regionales, offset `127397`), sin
     libraries ni literales unicode en el código fuente — evita el problema
     del punto 2.
   - `searchCountryCatalog(query)` reutiliza `normalizeSearchText`.

4. **`src/state/onboarding/`** — hecho, con test del repositorio (5 tests en verde).
   - `onboardingStatus.ts`: tipo `OnboardingStatus { completed, completedVersion, accessMode: 'guest'|'authenticated'|null }` + `onboardingVersion = 1`.
   - `onboardingStatusRepository.ts`: AsyncStorage, espeja el patrón exacto de
     `src/state/appPreferences/currencyPreferencesRepository.ts` (clave
     `@juntoss/onboarding-status/v1`, validación de forma, fallback a default
     si el JSON guardado no es válido).
   - `useOnboardingStatus.ts`: hook con `isReady`, `status`, `markGuestComplete()`,
     `markAuthenticated()`. Sin test dedicado (el resto de hooks equivalentes
     del repo tampoco lo tienen, p. ej. `useCurrencyPreferences.ts`).

5. **Dependencia `@react-navigation/native-stack`** — instalada
   (`npx expo install @react-navigation/native-stack`, quedó en
   `package.json` como `^7.18.8`, misma major que `@react-navigation/native`).
   **`package-lock.json` y `package.json` ya están modificados en el working
   tree** — no hace falta reinstalar, solo seguir.

## Qué falta (en el orden recomendado por el plan, sección "Orden de construcción")

Todo esto sigue pendiente, nada se empezó a escribir aún:

### 6. Bloques compartidos de onboarding (sin pantallas todavía)

- `src/theme/onboardingPreviewLayout.ts` — tokens escalados, mismo patrón que
  `src/theme/previewCard.ts` (`previewScale` multiplicando spacing/radii base).
- Editar `src/theme/motion.ts` — añadir `onboardingCardExitDuration`,
  `onboardingCardExitStagger`, `onboardingFlagFloatDuration` (nombres a
  ajustar, seguir la convención ya existente en ese archivo).
- `src/features/onboarding/model/previewFixtures.ts` — transacciones y
  categorías inventadas a partir de
  `src/features/categories/constants/defaultCategories.ts` (`defaultCategoryPages`,
  18 categorías reales). Tipos a respetar: `SessionTransaction` y `Category`
  de `src/features/transactions/types.ts` / `src/features/categories/types.ts`
  (ver plan para la forma exacta de ambos). También un puñado de `markedDates`
  de ejemplo (tipo `MarkedDates` de `react-native-calendars/src/types`) para
  la miniatura de calendario.
- `src/features/onboarding/hooks/useReduceMotionPreference.ts` — **patrón
  nuevo en la app**: usar `AccessibilityInfo.isReduceMotionEnabled()` +
  listener `'reduceMotionChanged'`. Hoy la app solo usa el softening nativo
  por-animación (`ReduceMotion.System` en llamadas de reanimated), no existe
  ningún booleano JS en ningún otro lado del código — no busques un hook
  existente, hay que crearlo.
- `src/features/onboarding/components/OnboardingScreenLayout.tsx` — headline/
  subtítulo/CTA sobre `Screen` (`src/components/layout/Screen/Screen.tsx`)
  no-scrollable y `transparentBackground`. El CTA es `ModalPrimaryAction`
  (`src/components/overlays/ModalPrimaryAction/ModalPrimaryAction.tsx`,
  `variant="cta"`) — no existe un componente `Button` separado en el repo.
- `src/features/onboarding/components/FloatingPreviewCardsLayer.tsx` — capa
  absoluta con `TransactionPreviewCard` / `CategoryPreviewCard` (variant
  `"tile"`) de `src/features/transactions/components/TransactionPreviewCard/`
  y `src/features/categories/components/CategoryPreviewCard/`. Animación idle
  con `withRepeat` + salida escalonada disparada por prop/ref al presionar
  Continuar (ver plan, sección "Mecanismo de animación").
- `src/features/onboarding/components/FloatingFlagsLayer.tsx` — capa absoluta
  decorativa con banderas de `countryCatalog`, oculta a accesibilidad
  (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`),
  posicionada evitando la franja del CTA y del buscador.
- `src/features/onboarding/components/CountrySearchField.tsx` — `TextInput`
  plano (NO `BottomSheetTextInput` de `@gorhom/bottom-sheet`, ese componente
  solo funciona dentro de un bottom sheet montado — la pantalla de país es
  pantalla completa, no un modal).

### 7. Pantallas, en orden del flujo

Todas dentro de `src/features/onboarding/screens/`:

1. `WelcomeScreen.tsx` — título "Menos dudas y más control sobre tu dinero.",
   subtítulo acortado "Organiza cada gasto e ingreso y ten una visión clara de
   tu dinero." (ajustable), `FloatingPreviewCardsLayer`, Continuar dispara la
   animación de salida y navega a `Name`.
2. `NameScreen.tsx` — "¿Cómo te llamas?" + input, Continuar llama
   `saveLocalProfileDisplayName(name)` (de `localProfileRepository.ts`, ya
   listo) y navega a `Country`.
3. `CountryScreen.tsx` — `FloatingFlagsLayer` + `CountrySearchField` + lista
   de países (`SelectableOption`, de `src/components/ui/SelectableOption/`)
   alimentada por `searchCountryCatalog`. Al elegir un país, Continuar llama
   `saveCurrencyPreferences({ currencies: [country.currencyCode] })` (ya
   existe en `src/state/appPreferences/currencyPreferencesRepository.ts`, no
   inventar almacenamiento nuevo) y navega a `CalendarPreview`.
4. `CalendarPreviewScreen.tsx` — "Tu mes tiene mucho que contarte" +
   `AppCalendar` (`src/components/ui/AppCalendar/AppCalendar.tsx`) en
   `mode="month"`, `currentDate` fija, `markedDates` inventados de
   `previewFixtures.ts`, `onSelectDate` no-op. Continuar navega a `Juntos`.
5. `JuntosScreen.tsx` — "Juntos pero no revueltos" + "Comparte gastos con tu
   pareja y conserva lo personal en tu propio espacio." Botón final dice
   "Empezar", no "Continuar", y sale del stack de onboarding hacia
   `AccessScreen` (no es un `navigate` dentro del mismo stack, es el cambio de
   rama a nivel de `RootNavigator`, ver punto 10).

Cada pantalla debe poder renderizarse/testearse de forma aislada (recibe
navegación vía props tipadas de `NativeStackScreenProps`, no depende de que
`OnboardingNavigator` ya exista).

### 8. `src/features/onboarding/OnboardingNavigator.tsx`

Native-stack con las 5 pantallas de arriba, `screenOptions={{ headerShown: false, animation: 'fade' }}`.
Param list local a este archivo (no tocar `src/navigation/types.ts`, ver plan
para el razonamiento). Revisar `gestureEnabled`/back por pantalla (p. ej.
deshabilitar volver desde `WelcomeScreen`).

### 9. `src/features/access/screens/AccessScreen.tsx`

Máquina de estados igual a `src/features/settings/components/AuthModal.tsx`
(mismo union de pasos: `'entry' | 'login' | 'signup' | 'verify-signup' | 'forgot' | 'verify-recovery' | 'reset'`),
pero como pantalla completa en vez de bottom sheet, y con una **tercera
acción en el paso `'entry'`** que `AuthModal` no tiene: "Probar sin cuenta" →
llama `markGuestComplete()` (del hook `useOnboardingStatus`) y no navega a
nada más (el cambio de rama a `MainTabsNavigator` lo resuelve el gating de
`RootNavigator`, punto 10). Los componentes `LoginScreen`/`SignUpScreen`/
`VerifyCodeScreen`/`ForgotPasswordScreen`/`ResetPasswordScreen` de
`src/features/auth/screens/` se reutilizan tal cual (ya son callback-props,
no dependen de navegación) — no tocarlos.

**Ajuste necesario en `AuthModal.tsx`** (el existente, el de Ajustes): sus
callbacks de éxito (`LoginScreen.onSuccess`, y el `onSuccess` que
`VerifyCodeScreen` dispara tras `SignUpScreen`) deben llamar también a
`markAuthenticated()` del nuevo `useOnboardingStatus()`, para que alguien que
completó el onboarding como invitado y luego crea cuenta desde Ajustes no
vuelva a ver `AccessScreen` en el próximo arranque. No dupliques la lógica:
llama a la misma función compartida desde `AuthModal` y desde `AccessScreen`.

### 10. Gating final en `src/navigation/RootNavigator.tsx` (el paso que activa todo)

Dentro de `NavigationContainer`, renderizado condicional (no un stack que
envuelve todo) según `useOnboardingStatus()` (nuevo) + `useAuthSession()`
(ya existe en `src/features/auth/hooks/useAuthSession.ts`):

```text
loading (¡ninguno de los dos "isReady" listo todavía!)
  → OnboardingNavigator          si !status.completed
  → AccessScreen                 si status.completed && status.accessMode === 'authenticated' && session === null
  → MainTabsNavigator             en cualquier otro caso (invitado completo, o autenticado con sesión)
```

No hace falta tocar `src/navigation/types.ts` ni `src/navigation/linking.ts`
(el subárbol `Main` sigue resolviendo igual cuando está montado). Verificar
con `tsc` que `LinkingOptions<RootDrawerParamList>` sigue tipando bien una vez
`NavigationContainer` tiene un hijo condicional.

Este es **el único paso que cambia el arranque real de la app** — hazlo al
final, cuando todo lo anterior ya compila y tiene sus tests en verde, para
minimizar el tiempo con la app en un estado a medio conectar.

### 11. Actualización de la Biblia (todavía no se tocó ningún archivo de `Bible/`)

- `Bible/DATABASE.md`: párrafo de la migración v16 (`local_profile.display_name`),
  mismo estilo que las versiones 8/9/14 ya documentadas.
- `Bible/JUNTOSS_ONBOARDING_GUIDE.md`: nueva sección "Pantalla — País y
  moneda" (mismo formato que las otras tres: objetivo, concepto visual,
  opciones de título/subtítulo, combinaciones recomendadas), actualizar el
  diagrama de §2 y renumerar las secciones siguientes, actualizar §21/§22 con
  el copy realmente implementado.
- `Bible/DECISIONS.md` ADR-012: añadir "Elegir moneda principal" a "Mensajes
  principales" (NO reemplazar la ADR — el flujo cabe dentro de su límite de
  cuatro láminas + captura de nombre, ver razonamiento completo en el plan).
- `Bible/PRODUCT.md` §7: actualizar "Dos o tres láminas" para describir las
  cuatro láminas reales.

### 12. Verificación final

- `npm run validate` (typecheck + lint + format:check + tests) debe pasar
  completo.
- Arrancar la app y recorrer el flujo entero manualmente: bienvenida →
  nombre → país/moneda → calendario → juntos → acceso → "Probar sin cuenta" →
  llega a Inicio.
- Reabrir la app: debe saltar directo a Inicio.
- Crear cuenta real desde Ajustes y confirmar que no vuelve a pedir
  onboarding/acceso en el siguiente arranque.
- Probar con "Reducir movimiento" del sistema activado.
- Revisar modo oscuro en las cinco pantallas nuevas.
- Verificar con VoiceOver/TalkBack que las capas decorativas no se anuncian.

## Cómo verificar que el estado actual sigue sano antes de continuar

```bash
cd "/Users/alanalphonzo/Documents/Apps/Juntos Rebirth"
npx tsc --noEmit
npx jest src/lib/geography/countryCatalog.test.ts src/lib/text/normalizeSearchText.test.ts src/lib/currency/currencyCatalog.test.ts src/state/onboarding src/features/profile/repositories/localProfileRepository.test.ts src/lib/storage/localDatabase.test.ts src/features/settings/screens/SettingsScreen.test.tsx src/navigation/MainTabsNavigator.test.tsx --runInBand
```

Todo debería estar en verde (56 tests entre los archivos tocados hasta ahora,
sin contar el resto de la suite). Si algo falla, algo se corrompió respecto a
lo que dejó esta sesión — revisar diffs antes de seguir.

## Nota sobre el archivo de plan de Claude Code

Este handoff es un resumen independiente. La fuente completa y autoritativa
sigue siendo `/Users/alanalphonzo/.claude/plans/encapsulated-rolling-mountain.md`
— si tu agente puede leer fuera del repo, léela primero. Si no puede, este
archivo (`ONBOARDING_HANDOFF.md`, en la raíz del repo) tiene todo lo esencial
para continuar sin ella. Borra este archivo cuando el trabajo esté terminado
y mergeado — es un documento de traspaso, no documentación permanente del
proyecto.
