# ARCHITECTURE.md

## 1. Objetivo

Este documento define la arquitectura técnica de `juntoss`, los límites entre capas y la estructura recomendada del repositorio.

Debe facilitar cambios pequeños, mantener juntas las piezas de una misma funcionalidad, evitar carpetas globales sin criterio, separar interfaz y persistencia, funcionar en iOS y Android y exigir una sesión verificada para acceder a datos.

---

## 2. Principio estructural

Todo el código fuente de la aplicación vive dentro de `src/`.

Fuera de `src/` permanecen:

- Configuración.
- Proyectos nativos.
- Assets requeridos por compilación.
- Integración con Juntoss API.
- Scripts.
- Documentación.
- Automatización.
- Configuración de pruebas y herramientas.

No debe existir simultáneamente lógica de aplicación en carpetas raíz como `components`, `hooks`, `services`, `store`, `utils`, `styles` o `contexts`.

---

## 3. Estructura propuesta

```text
juntoss/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
├── android/
├── ios/
├── assets/
│   ├── fonts/
│   ├── icons/
│   ├── images/
│   └── animations/
├── docs/
├── instructions/
│   ├── README.md
│   ├── agents/
│   ├── prompts/
│   └── skills/
├── scripts/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── navigation/
│   ├── services/
│   ├── state/
│   ├── theme/
│   ├── types/
│   └── utils/
├── tests/
│   ├── integration/
│   └── e2e/
├── App.tsx
├── app.json
├── babel.config.js
├── eslint.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

Los documentos pueden vivir en raíz o en `docs/`, pero no deben existir copias divergentes.

---

## 4. `src/app/`

Contiene arranque y composición global.

```text
src/app/
├── AppProviders.tsx
├── AppBootstrap.tsx
├── ErrorBoundary.tsx
├── config/
├── providers/
└── startup/
```

Responsabilidades:

- Inicialización.
- Proveedores.
- Restauración de sesión.
- Configuración.
- Migraciones locales.
- Selección inicial de navegación.
- Manejo global de errores.

No contiene lógica específica de movimientos, categorías o espacios.

El arranque monta `RootNavigator` mientras Expo carga las fuentes: la lectura
de sesión, de la apariencia guardada y de la marca de onboarding empieza en
paralelo. La navegación espera esas condiciones cuando el onboarding ya está
completado; en una instalación nueva muestra el onboarding tan pronto como
este y la apariencia están listos, porque la sesión no decide ese destino.
`RootNavigator` mantiene la preferencia de apariencia únicamente para una
sesión verificada. Todo el árbol previo a la sesión —onboarding y acceso con
sus formularios— se monta dentro de un proveedor claro, y el fondo de
navegación y la barra de estado usan ese mismo esquema para que cerrar sesión
no conserve visualmente el modo oscuro de la cuenta anterior. El proveedor de
bottom sheets también se monta dentro de ese tema activo: su host de portal y
el contenido de los modales reciben así la misma paleta que la pantalla.
Así, un refresco de sesión durante el alta no desmonta el formulario OTP. La
navegación conserva la exigencia de correo verificado. La sesión cuenta
como lista en cuanto el cliente Expo de Better Auth la hidrata desde
SecureStore, sin esperar a que `/get-session` responda: es la misma sesión
verificada de la visita anterior y, si el servidor la niega, la navegación
vuelve al acceso. `LoadingState` muestra una barra de progreso sin texto, en
el morado `cta` del tema, que avanza una sola vez de izquierda a derecha:
un tramo rápido y luego un avance lento hasta el 92 % para no parecer
detenida. `LoadingProgressProvider` comparte ese avance entre la etapa de
fuentes y sesión (`RootNavigator`) y la de datos (`MainTabsNavigator`): la
barra que se desmonta ofrece su avance y la siguiente lo continúa solo si se
monta en el mismo commit; en otro caso vuelve a empezar. `NavigationContainer`
recibe la misma barra como `fallback` porque, mientras `linking` resuelve la
URL inicial, no monta hijos y ese hueco reiniciaría el avance. Al estar listos los
espacios y las finanzas, la barra se completa y el fondo se desvanece mientras
cada bloque de Home entra por separado con `getStartupEntering` (fundido y
desplazamiento corto, desfase acotado). Todo se hace con Reanimated y respeta
el movimiento reducido del sistema. El contenido se monta solo cuando está
listo; la animación no controla la disponibilidad de datos ni impone una
espera mínima.
Las ilustraciones principales de onboarding, acceso e invitaciones se
precargan en segundo plano desde `AppBootstrap`, mediante una promesa compartida
e idempotente que alimenta Expo Asset y, para URLs servidas por Metro o remotas,
la caché nativa de `Image`. El montaje del onboarding vuelve a invocar la misma
promesa como guarda local, sin duplicar trabajo. La interfaz no espera a que
termine la precarga; `10_loginicon.png` forma parte explícita del lote para que
normalmente esté disponible antes de llegar a Acceso.

La apertura de la cuenta es local-first (`useSessionStartup`, en
`features/sync/hooks/`): `initializeAuthenticatedSession` decide primero si la
caché SQLite pertenece a quien entra y, si la conserva, avisa por
`onLocalCacheReady` antes de la primera petición de red; la navegación
principal pinta entonces la caché tal cual. El bootstrap, el snapshot y la
subida de cambios pendientes siguen en segundo plano en su orden habitual, y
al terminar el estado se vuelve a leer de SQLite. Solo cuando la caché era de
otra cuenta, o no se podía atribuir, se espera al snapshot. Si la caché no se
pudo borrar o apartar (`LocalCacheIsolationError`, ver `API.md` «Sesión y
restauración»), `SessionStartupGate` no monta la navegación principal: muestra
`LocalCacheBlockedState` con «Reintentar» (vuelve a la carga, no a la
navegación) y «Cerrar sesión» (sin borrar nada), y nunca lee esa caché. El refresco periódico (`useSharedDataPolling`) arranca
después de esa inicialización y espera un intervalo completo (2 s) con peticiones
delta (`GET /v1/sync/changes`): repetir la descarga que acaba de terminar sería
trabajo duplicado. Aplica retroceso exponencial ante fallos sucesivos (hasta 5 min)
y se pausa cuando la aplicación pasa a segundo plano o pierde conexión, ejecutando
un tick inmediato y retomando la cadencia normal al volver al primer plano o recuperar la red.
Si esa inicialización falla, la caché sigue en pantalla y `NoticeToast` (único
aviso global: confirmaciones, avisos recuperables y sin conexión, con tono y
acción opcional) ofrece "Reintentar"; sin conexión se reintenta también al
recuperar la red (aunque el aviso ya se haya retirado), y un 401 cierra sesión
sin aviso.

`SyncIssueToast` reúne el estado de red y de sincronización en un único aviso
arriba. Sin conexión (al abrir o al perderla en uso, tras 1,5 s para ignorar
cortes breves, o cuando una petición falla por red) muestra una tarjeta
`persistent` con wifi tachado que explica que los cambios se guardan en el
dispositivo y se subirán al reconectar; tocarla la oculta hasta el siguiente
corte y queda por debajo de los avisos breves. Al volver la red confirma
"Conexión recuperada". `useNetworkAvailability` comparte una sola suscripción
nativa (`expo-network`) entre todos sus consumidores.

### Diagnóstico de arranque y optimización de bundle

Para medir el rendimiento del arranque en desarrollo, `src/lib/diagnostics/startupTrace.ts` registra marcas temporales clave (`bundle_evaluated`, `fonts_ready`, `session_ready`, `local_db_ready` al terminar de abrir y migrar SQLite, `local_finance_ready` cuando la caché local ya está cargada en memoria, `init_done`) e imprime una tabla diagnóstica en `console.info` al completarse la inicialización (no-op en producción).

`AppBootstrap` empieza a abrir y migrar SQLite al montar, en paralelo a las fuentes y a la sesión, para que la caché esté lista cuando la pida la pantalla principal. Las fuentes Gilroy se incrustan en el binario nativo con el plugin `expo-font` (requiere regenerar el build nativo); en Expo Go se siguen cargando con `useFonts`. Las comprobaciones de esquema que `migrateLocalDatabase` repite en cada arranque son deliberadas (reparan bases que llegaron a la versión actual sin columnas) y no se omiten.

La configuración de Metro (`metro.config.js`) activa `inlineRequires: true` para diferir la evaluación de módulos hasta su primer uso, acelerando la llegada a la primera pintura y a `local_finance_ready`. Los efectos de módulo secundarios (como `ensureNotificationHandlerRegistered`) se ejecutan dentro del ciclo de vida de React (`useEffect` en `AppBootstrap`) para evitar efectos colaterales prematuros.

React Compiler (`experiments.reactCompiler` en `app.json`) se adopta por carpetas: `babel.config.js` lista los directorios compilados (hoy `src/navigation/`, `src/components/`, `src/theme/`, las features `activity`, `dashboard` y `map`, y los `components/` de `accounts`, `categories`, `exchangeRates` y `transactions`) y se amplía fase a fase tras comprobar que el compilador no abandona sus funciones y que las pruebas pasan con él activo. Los tests no se compilan. Dos reglas acompañan esta adopción en `MainTabsNavigator`:

- Las pestañas y las hojas globales se construyen como elementos en el cuerpo del componente, no dentro de la función `children` de `Drawer.Screen`: el compilador no memoiza lo que se crea dentro de esas funciones, y abrir una hoja repintaba todas las pestañas y las demás hojas.
- Los `SharedValue` de Reanimated se escriben con `.set()`, no asignando `.value`: el compilador no admite mutar un valor devuelto por un hook y abandonaría el componente entero.
- Los manejadores que llegan de hooks que el compilador no puede compilar (por ejemplo, con `try/catch` que contienen condicionales) se fijan con `useStableCallback` (`src/hooks/`), y los objetos que devuelven se memoizan en el propio hook.

---

## 5. `src/navigation/`

```text
src/navigation/
├── RootNavigator.tsx
├── AccessScreen.tsx
├── MainTabsNavigator.tsx
├── types.ts
├── linking.ts
└── components/
```

Reglas:

- Rutas tipadas.
- Nombres centralizados.
- Modales globales en el navegador raíz cuando corresponda.
- El selector de espacios no es una pestaña.
- Los permisos no deben quedar dispersos entre pantallas.
- Las pantallas no importan navegadores completos.

---

## 6. `src/components/`

Solo componentes reutilizables entre dominios o pertenecientes al sistema de diseño.

```text
src/components/
├── ui/
│   ├── Button/
│   ├── IconButton/
│   ├── Text/
│   ├── Card/
│   ├── Input/
│   ├── Switch/
│   ├── Badge/
│   └── Progress/
├── feedback/
│   ├── EmptyState/
│   ├── ErrorState/
│   ├── LoadingState/
│   └── OfflineState/
├── layout/
│   ├── Screen/
│   ├── Stack/
│   ├── Row/
│   ├── KeyboardAwareContainer/
│   └── SettingsList/
├── overlays/
│   ├── AppModal/
│   ├── BottomSheet/
│   ├── ConfirmDialog/
│   └── NoticeToast/
└── navigation/
    ├── ScreenHeader/
    └── ActiveSpaceSelector/
```

Un componente usado solo por movimientos vive en `features/transactions/components/`.

---

## 7. `src/features/`

Organiza el proyecto por dominios.

```text
src/features/
├── onboarding/
├── auth/
├── transactions/
├── categories/
├── accounts/
├── import/
├── spaces/
├── dashboard/
├── activity/
├── extras/
├── savings/
├── plans/
├── legal/
└── profile/
```

`import` cubre la importación de movimientos desde archivos bancarios (Excel/CSV en la Fase 1, ver ADR-069). Su estructura interna añade capas propias del dominio sobre el patrón general de esta sección:

```text
features/import/
├── screens/
├── components/
├── parsers/
├── normalization/
├── categorization/
├── deduplication/
├── validation/
├── repositories/
├── gateways/
├── services/
├── utils/
├── constants/
└── types.ts
```

Los movimientos importados se crean mediante `createLocalTransactions` en `features/transactions/repositories/localTransactionRepository.ts`, el mismo repositorio que usa la creación manual: no existe un segundo modelo de movimientos para importación.

Una feature puede contener:

```text
feature/
├── components/
├── screens/
├── hooks/
├── services/
├── repositories/
├── model/
├── schemas/
├── state/
├── utils/
├── constants/
├── types.ts
└── index.ts
```

No todas las carpetas deben crearse automáticamente. Solo cuando exista una responsabilidad real.

---

## 8. Pantallas

Las pantallas viven dentro de su feature:

```text
src/features/dashboard/screens/HomeScreen.tsx
src/features/activity/screens/ActivityScreen.tsx
src/features/categories/screens/CategoryDetailScreen.tsx
```

Una pantalla debe:

- Componer componentes.
- Obtener datos mediante hooks o controladores.
- Gestionar estado visual local.
- Delegar persistencia y reglas.
- Renderizar carga, vacío y error.

No debe:

- Construir SQL.
- Manipular tablas directamente.
- Contener sincronización.
- Duplicar diseño.
- Mezclar cientos de líneas de lógica y presentación.

Una lista que puede crecer con el historial (como los movimientos de Actividad) no se monta entera: `useIncrementalLimit` (`src/hooks/`) monta una tanda y añade otra con `onEndReached` de `Screen`, y solo vuelve a la primera tanda al cambiar los filtros. Las filas de `TransactionPreviewList` se memoizan comparando lo que pintan, de modo que una recarga con los mismos datos no las repinta. `listTransactionsThroughCurrentMonth` cachea la proyección de recurrentes por lista y mes, porque Inicio, Actividad y sus resúmenes la pedían varias veces por cada cambio de datos: su resultado se comparte y no debe mutarse (es `readonly`).

---

## 9. Modales

No debe existir una carpeta global `modals/` llena de implementaciones aisladas.

Debe existir:

1. Una primitiva global.
2. Modales específicos dentro de su feature.

```text
src/components/overlays/AppModal/
src/features/transactions/components/CreateTransactionModal/
src/features/categories/components/CategoryPickerModal/
```

El modal de movimiento reutiliza:

- Encabezado.
- Botón cerrar.
- Acciones inferiores.
- Gestos.
- Safe area.
- Teclado.
- Animaciones.
- Accesibilidad.

Reglas de rendimiento de las hojas:

- Una hoja que abre otra lo hace con `useModalChainedAction`, cuando la primera termina de cerrarse; nunca en el mismo commit.
- Una hoja de detalle conserva su entidad hasta `onDismissed`, para animar el cierre en lugar de desmontarse de golpe.
- Las listas de movimientos dentro de hojas usan `TransactionPreviewList` con `progressive`: la hoja se monta con las primeras filas y el resto llega en un render diferido.
- En iOS, `AppModal` usa `motion.sheetSpring`, que da el cierre por terminado cuando falta ~1 px, para que `onDismissed` no llegue cientos de milisegundos después de que la hoja dejó de verse.
- Un cierre por gesto se notifica al padre con `onClose` en cuanto empieza a animarse (`onAnimate`), sin esperar a `onDismiss`. La librería solo emite `onDismiss` si la animación termina completa; cuando se interrumpía, el padre se quedaba con `visible` en `true` y la hoja no volvía a abrirse.

Acciones de pulsación larga de las tarjetas (`PRODUCT.md` §14):

- `components/overlays/PreviewActions/` es genérico: tipos de acción (`run`, `confirm`, `copyToSpace`), geometría del arco y la superposición visual. No conoce el dominio.
- `navigation/components/PreviewActionsLayer` envuelve pestañas y hojas, publica en un contexto solo la función de apertura (con identidad fija, para no repintar las tarjetas) y pinta la superposición en el host de portal `preview-actions` de la raíz. Ese host es hermano de las hojas, con `zIndex` y `elevation` entre la capa de hojas y los avisos.
- Lo que se pinta en un portal pierde los contextos de la pantalla: la capa reinyecta la preferencia de símbolos de moneda y el censo del espacio (`SpaceMembershipScope`) para que la copia elevada sea idéntica a la tarjeta.
- `navigation/previewItemActions` decide las acciones de cada movimiento o categoría con las mismas reglas y los mismos textos que los detalles (`transactionActionCopy`, `categoryActionCopy`).
- Coste en reposo mínimo: ninguna tarjeta crea valores animados ni efectos. La superposición solo se monta al abrirse, y sus animaciones (`Keyframe` de Reanimated en el hilo de UI) respetan el movimiento reducido.
- Selección múltiple: `previewSelection` es un almacén externo (`useSyncExternalStore`). Cada tarjeta horizontal de movimiento se suscribe solo a su propio estado (`off`, `disabled`, `selected`, `unselected`), así marcar una no repinta las demás. Si una tarjeta admite la acción se resuelve una vez por selección con el mismo `resolveActions`. `PreviewSelectionFrame` abre el círculo y encoge la tarjeta con transiciones CSS de Reanimated, que no crean valores animados en reposo, y `PreviewSelectionBar` se pinta en el mismo portal que la superposición.
- `resolveActions` recibe `{ kind, ids }`: un elemento tras la pulsación larga o varios movimientos desde la selección. Varios se eliminan uno tras otro con el manejador individual y se copian con `useCopyToSpace`, que encadena las categorías creadas y muestra un solo aviso.
- El desenfoque es el mismo `BlurScrim` del fondo de las hojas.

---

## 10. Hooks, servicios y librerías

### `src/hooks/`

Solo hooks transversales:

- `useNetworkStatus`
- `useKeyboard`
- `useReducedMotion`
- `useDebouncedValue`

Los hooks de categorías o movimientos viven en su feature.

### `src/services/`

Servicios transversales:

- Analítica.
- Anuncios (`ads/mobileAds.ts`): carga diferida de AdMob como Clarity, para
  que Expo Go siga funcionando; reúne el consentimiento UMP, inicializa el SDK
  y carga el anuncio nativo de Inicio (`features/ads`).
- Crash reporting.
- Notificaciones.
- Logging.
- Almacenamiento seguro.

### `src/lib/`

Adaptadores de librerías externas:

```text
src/lib/
├── auth-client.ts
├── storage/
├── dates/
├── currency/
├── i18n/
└── validation/
```

El resto de la app no debe depender directamente de detalles complejos de configuración de proveedores.

#### Idiomas (`src/lib/i18n/`)

- `i18next` + `react-i18next`, con una instancia propia inicializada al
  importar `i18n.ts` (desde `AppProviders` y `src/test/setup.ts`).
- Idiomas admitidos: español (referencia) e inglés. `locales/es.ts` define las
  claves y `locales/en.ts` debe cubrirlas todas: una clave ausente no compila,
  y `t()` está tipado con esas claves.
- Sin elección guardada se sigue el idioma del dispositivo (`expo-localization`);
  si no está admitido, español. La elección se guarda en el dispositivo, no en
  la cuenta, porque el onboarding la pide antes de que exista sesión.
  `AppBootstrap` la restaura antes de pintar la primera pantalla.
- Solo se traduce lo que ve el usuario. Los logs, los errores internos y los
  datos sincronizados se quedan en español.

Los componentes escriben sus textos en español y **no cambian para
traducirse**. La traducción se enlaza fuera de ellos:

- `dictionary/en.ts` reúne, por áreas (`dictionary/en/*.ts`), el texto en
  inglés indexado por el texto español tal como aparece en el código. Las
  frases con partes variables usan marcadores: `'Cambiar fecha: {{date}}'`.
  Un texto nuevo se traduce añadiéndolo al archivo de su área.
- `translateText` resuelve un texto por coincidencia exacta, después por
  patrón (los valores capturados también se traducen), por fechas con nombres
  de días y meses, y por segmentos de etiquetas como «🇪🇸  España · EUR».
  Sin traducción devuelve el texto original. En español no hace nada.
- `babel.config.js` usa `jsxImportSource: '@/lib/i18n/jsx'` solo para `src/`
  y `App.tsx`: ese runtime traduce `children`, `accessibilityLabel`,
  `accessibilityHint` y `placeholder` antes de delegar en el de React. Las
  dependencias conservan el runtime de React para no crear un ciclo con
  `react-native`.
- Lo que no pasa por JSX se enlaza aparte: `installTranslationHooks` envuelve
  `Alert.alert` y `AccessibilityInfo.announceForAccessibility`, y
  `localNotifications` traduce título y cuerpo al programar.
- Al cambiar de idioma, `RootNavigator` vuelve a montar la navegación en la
  misma pantalla para que todo se pinte otra vez. Por eso el onboarding aplica
  el idioma elegido al continuar, no al tocar la opción.
- Ajustes, el selector de idioma y la pantalla de país del onboarding usan
  `useTranslation()` con las claves de `locales/` (primera entrega); el resto
  de la app usa el diccionario.
- Fechas: el código formatea con `Intl.DateTimeFormat('es-ES')`.
  `installDateLocale` (primer import de `index.ts` y de `src/test/setup.ts`)
  hace que ese locale signifique «idioma activo», eligiéndolo al formatear:
  en inglés salen «October 3, 2026» y «10/03/2026», también en los
  formateadores creados al cargar un módulo. Las horas `HH:mm` se muestran en
  12 h («8:05 PM») y las fechas compuestas a mano se reordenan por patrón.
- Pendiente: los importes siguen el formato numérico `es-ES` (`1.234,56`); el
  texto legal en inglés es una traducción de referencia y el español es el
  vinculante.

---

## 11. Estado global

```text
src/state/
├── session/
├── activeSpace/
├── appPreferences/
└── sync/
```

Candidatos válidos:

- Sesión.
- Usuario actual.
- Espacio activo.
- Red.
- Preferencias.
- Estado general de sincronización.

No deben colocarse automáticamente todos los movimientos, categorías o formularios en un store global.

---

## 12. Sistema de diseño

```text
src/theme/
├── colors.ts
├── fonts.ts
├── typography.ts
├── spacing.ts
├── layout.ts
├── radii.ts
├── shadows.ts
├── motion.ts
├── platform.ts
├── ThemeProvider.tsx
└── types.ts
```

Responsabilidades actuales:

- `fonts.ts`: nombres y assets estáticos de Gilroy cargados en runtime con una
  identidad estable entre iOS, Android y web.
- `typography.ts`: variantes semánticas con tamaño, interlineado, tracking y peso, ajustes compactos para estilos de presentación, rampa Dynamic Type y tope de escalado del sistema por variante.
- `spacing.ts`: rejilla de 8 pt con sub-rejilla de 4 pt.
- `layout.ts`: objetivo táctil mínimo, alturas de control, márgenes, separaciones, tamaños de icono y densidad de disposición.

El encabezado de espacio activo se compone una sola vez por encima del
navegador de pestañas, fuera del scroll de cada pantalla. Un drawer de React
Navigation contiene la selección y creación de espacios, sin convertir cada
espacio en una ruta ni duplicar el encabezado por feature.

La adaptación al tamaño de pantalla no usa consultas de medios: `useLayoutDensity` (`src/hooks/`) devuelve `compact` o `regular` a partir de la altura de la ventana. Los componentes leen el valor correspondiente de `layout` y la primitiva `Text` reduce únicamente los estilos grandes de presentación en densidad compacta; cuerpo, etiquetas y captions mantienen su tamaño legible. Las decisiones están registradas en ADR-035 y ADR-042.

Mapa mantiene una única composición semanal virtualizada sobre una `FlatList`
nativa. Cada fila calcula su altura a partir de las mini tarjetas de movimientos
que contiene, y el encabezado Lun-Dom permanece fuera de la lista. La selección
de día, los límites y la proyección de recurrencias comparten el mismo índice
local de fechas. El modelo abarca de enero de 2024 a diciembre de 2080. El
resumen mensual permanece montado sobre el calendario y recibe la moneda global
efectiva desde navegación; no mezcla importes de monedas distintas.

Los tamaños de fuente se declaran únicamente en `src/components/ui/Text/`. Las pantallas y componentes usan `<Text variant="…">`; usar el `Text` de React Native se salta los topes de escalado accesible.

Evitar:

- Colores dispersos.
- Espaciados arbitrarios repetidos.
- Radios sin intención.
- Duraciones inconsistentes.
- Tipografías inventadas por pantalla.
- Alturas y tamaños de icono sueltos en lugar de tokens.

Los estilos específicos se mantienen junto al componente. No debe existir una carpeta global `styles/` para estilos de pantallas no relacionadas.

---

## 13. Tipos y utilidades

### `src/types/`

Tipos globales compartidos entre varios dominios. Los tipos de una feature permanecen en su feature.

### `src/utils/`

Funciones puras, pequeñas y transversales.

No contiene:

- Red.
- Base de datos.
- Estado.
- Navegación.
- Lógica compleja de dominio.
- Archivos `helpers.ts` con funciones inconexas.

---

## 14. Modelo por capas

Responsabilidades:

### Presentación

Pantallas, componentes, navegación e interacciones.

### Aplicación

Casos de uso y coordinación.

### Dominio

Entidades, reglas, cálculos y estados válidos.

### Infraestructura

Juntoss API, persistencia local, red y servicios externos.

Dirección preferida:

```text
UI -> aplicación/dominio -> repositorios -> infraestructura
```

Evitar:

```text
componente -> cliente HTTP o de autenticación -> API
```

---

## 15. Repositorios

Los repositorios permiten utilizar la misma interfaz con persistencia local o remota.

```ts
interface TransactionRepository {
  listBySpace(input: ListTransactionsInput): Promise<Transaction[]>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(input: UpdateTransactionInput): Promise<Transaction>;
  archive(id: TransactionId): Promise<void>;
}
```

Implementaciones posibles:

```text
transactions/repositories/
├── transactionRepository.ts
├── localTransactionRepository.ts
├── remoteTransactionRepository.ts
└── syncedTransactionRepository.ts
```

La caché local se restaura únicamente para una sesión verificada; no existen
repositorios ni migraciones de invitado.

---

## 16. Persistencia local y sincronización

Flujo conceptual:

```text
UI
  -> caso de uso
  -> sesión verificada
  -> caché local y sincronización remota de la cuenta autenticada
```

La estrategia detallada está en `API.md`.

El catálogo pequeño de espacios y el identificador activo continúan guardándose
mediante un repositorio encapsulado sobre AsyncStorage, que serializa sus
escrituras y expone `updateSpaces(mutate)` para leer, transformar y guardar
como una sola operación; quien fusiona datos remotos usa esa vía en vez de
guardar una copia en memoria. Las categorías y los
movimientos usan SQLite mediante `expo-sqlite`, con migraciones versionadas y
repositorios dentro de cada feature. La interfaz conserva arrays de dominio para
presentación, pero restaura y confirma cada mutación a través del repositorio; no
accede directamente a SQLite.

La frontera remota vive en `src/services/api/` y la coordinación de migración
en `src/features/sync/`. La UI no importa el cliente: una vez exista sesión,
llama al caso de uso autenticado, que prepara el lote SQLite, lo envía mediante
un gateway y confirma localmente los conteos.

El presupuesto de una categoría es por moneda y vive en `category_budgets`,
una fila por categoría y moneda (versión local 35): `budget_minor`, `period`
(`month`, `week`, `fortnight` o `custom`), `interval_days` y `anchor_on` para
el personalizado, `overrides_json` con los importes de periodos concretos e
`history_json` con los tramos anteriores cuando la periodicidad cambia desde
un periodo; el periodo frontera se recorta para que los tramos no se solapen.
En el dominio es `Category.budgets[moneda]`. Las columnas `budget_*` de
`categories` (versiones 33 y 34) son herencia de cuando el presupuesto era
solo de la moneda del espacio: `migrateLegacyCategoryBudgets` las mueve una
vez a esa moneda —que solo se conoce en AsyncStorage— y las vacía. Guardar un
presupuesto marca la categoría como pendiente, y `syncCoupleSpaceData` sube
todos sus presupuestos en `budgets[]`; el servidor los reescribe enteros en su
`category_budgets` (`period`, `interval_days`, `anchor_on`, `overrides`,
`history`). Al bajar, los presupuestos remotos sustituyen a los locales solo
si la fila de la categoría se aplicó, es decir, si no había cambios locales
sin subir. Los cálculos de periodo están en
`features/categories/utils/categoryBudgetPeriod.ts`, que reutiliza los
periodos de Actividad para mensual, semanal y quincenal.

### 16.1 Usuario demo de desarrollo

Para grabar demos y material de marketing sin rellenar la app a mano, Iniciar
sesión muestra en builds de desarrollo (`__DEV__`) la acción «Crear usuario
demo». Pide una moneda (`features/demo/constants/demoCurrencyProfiles.ts`) y
crea en el dispositivo:

- Un espacio personal y un espacio juntos activo con dos personas ficticias
  (p. ej. Angélica y Manuel); quien usa el demo es una de ellas y los
  movimientos del espacio juntos se reparten entre ambas.
- Cuentas, categorías predeterminadas y personalizadas, presupuestos, notas y
  unos cinco meses de historia más dos de planes futuros, con movimientos
  únicos, semanales, quincenales, mensuales y personalizados.

El guion (`features/demo/scenario/`) es puro y reproducible con una semilla.
Está escrito en euros para una pareja de clase media en España, con el reparto
de gasto de la Encuesta de Presupuestos Familiares del INE, y cada moneda lo
escala por su coste de vida, no por su tipo de cambio.

Venezuela se elige con el bolívar y sigue el modelo de
`JUNTOSS_VENEZUELA_CURRENCY_PLAN.md` §0.1: país `VE`, monedas activas USD y
VES, y cuentas y espacios solo en USD. Los gastos fijos van en dólares; las
compras pequeñas (café, panadería, farmacia, luz, gas) se registran en
bolívares y sin cuenta. Como el demo no habla con el servidor,
`features/demo/utils/demoVenezuelaRates.ts` hace sus veces con tasas BCV y EUR
**ficticias** y deterministas por fecha:

- La siembra congela en cada movimiento `accounting_amount_minor_usd` y
  `exchange_snapshot_json`, igual que haría el servidor al sincronizar.
- Con el demo activo, `juntossExchangeRateGateway` responde la tasa vigente y
  el preview desde ese módulo, y `listCustomExchangeRates` devuelve una lista
  vacía. Crear una tasa personalizada falla, porque vive en el servidor.
- Las ocurrencias recurrentes que se materialicen después de la siembra no
  tienen snapshot, igual que un movimiento real aún no sincronizado.

La siembra usa los repositorios locales de siempre, parte de una caché vacía y
marca `local_sync_account` con el id demo. Solo al terminar guarda la sesión
en `state/demoSession/demoSessionStore.ts` (AsyncStorage), y
`useBetterAuthSession` la presenta como una sesión verificada sintética. Con
ella:

- `juntossApiClient` rechaza toda petición con `DEMO_SESSION` antes de llegar a
  `fetch`. Es la guarda de último recurso.
- La apertura de sesión, el polling, el refresco del espacio de pareja, el
  censo, la subida de avatar y el registro push no llegan a llamar a la red.
- Ajustes sustituye «Cerrar sesión» por «Eliminar usuario demo», que cierra la
  sesión demo, borra la caché como un cierre de sesión normal
  (`discardBackedLocalSessionCache`, que también cierra el demo) y devuelve las
  preferencias de moneda previas.

Una build de release nunca abre un demo, aunque quede uno guardado.

---

## 17. Contextos de React

Apropiados para:

- Tema.
- Sesión.
- Espacio activo.
- Configuración global.
- Inyección de servicios.

Inapropiados para:

- Un contexto por pantalla.
- Datos remotos extensos.
- Formularios simples.
- Estado que usa un único componente.

No debe existir una carpeta `contexts/` sin criterio.

---

## 18. Código por plataforma

Opciones:

```text
Component.ios.tsx
Component.android.tsx
```

o condiciones pequeñas mediante APIs de plataforma.

Reglas:

- Archivos separados cuando la implementación diverge sustancialmente.
- Condiciones pequeñas cuando la diferencia es puntual.
- Misma API pública.
- Pruebas o verificación en ambas plataformas.
- Degradación elegante en Android para efectos exclusivos de iOS.

---

## 19. Assets

```text
assets/
├── fonts/
├── icons/
│   ├── navigation/
│   ├── categories/
│   └── system/
├── images/
│   ├── onboarding/
│   └── illustrations/
└── animations/
```

Reglas:

- Nombres semánticos.
- Sin duplicados innecesarios.
- Tamaño optimizado.
- Licencias conservadas.
- Preferir vectores cuando corresponda.

---

## 20. `instructions/`

```text
instructions/
├── README.md
├── agents/
│   ├── coding.md
│   ├── review.md
│   └── testing.md
├── prompts/
└── skills/
```

Reglas:

- No contradecir documentación principal.
- No duplicar fuentes de verdad.
- No guardar secretos.
- Revisar cualquier skill antes de confiar en ella.
- `PROJECT_RULES.md` tiene prioridad.

---

## 21. `.github/`

```text
.github/
├── workflows/
│   ├── quality.yml
│   ├── tests.yml
│   └── build.yml
├── ISSUE_TEMPLATE/
└── PULL_REQUEST_TEMPLATE.md
```

Sirve para automatización y plantillas. La distribución de actualizaciones depende de App Store, Google Play y la estrategia seleccionada.

---

## 22. Carpetas generadas y plugins

### `node_modules`

- No se edita.
- No se versiona.
- Los parches deben ser reproducibles.

### `dist`

- Es salida generada.
- No contiene código fuente manual.
- No se importa desde la app.
- Normalmente se ignora en Git.

### `plugins`

No debe existir como carpeta genérica salvo que contenga código nativo o adaptadores locales claramente necesarios.

---

## 23. Imports

Se recomiendan aliases:

```ts
import { Button } from "@/components/ui/Button";
import { useActiveSpace } from "@/state/activeSpace";
import { CreateTransactionModal } from "@/features/transactions";
```

Reglas:

- Evitar rutas relativas profundas.
- Evitar ciclos.
- Las features consumen APIs públicas, no detalles internos.
- No crear archivos barril gigantes.

---

## 24. Límites entre features

Correcto:

```ts
import { CategoryPicker } from "@/features/categories";
```

Evitar:

```ts
import { CategoryPicker } from "@/features/categories/components/internal/CategoryPicker";
```

Cuando dos features comparten algo:

- Visual transversal → `components/`.
- Dominio transversal → módulo compartido explícito.
- No mover globalmente solo porque se usa dos veces dentro del mismo dominio.

---

## 25. Pruebas

- Unitarias junto al archivo.
- Integración en `tests/integration/`.
- End-to-end en `tests/e2e/`.

Prioridades:

- Balances.
- Aislamiento por espacio.
- Migración.
- Idempotencia.
- Permisos.
- Creación de movimientos.
- Separación.
- Sincronización.
- iOS y Android.

---

## 26. Errores, logs y seguridad

- Normalizar errores.
- No mostrar mensajes técnicos crudos.
- No registrar importes, títulos, tokens o información sensible.
- Las tareas de fondo (sincronización, censo, perfil, avatar, tasas) registran
  sus fallos con `reportBackgroundFailure`
  (`src/lib/diagnostics/backgroundFailure.ts`): un fallo por falta de red
  (`isNetworkFailure`) no se registra, porque es lo esperado y el aviso
  "Sin conexión" de `SyncIssueToast` ya informa a la persona.
- La autorización real vive en la API.
- El espacio activo visual no sustituye la autorización del servidor.
- Ningún secreto entra en el bundle.
- Las operaciones destructivas son explícitas.
- Las contraseñas nunca se persisten: viven solo en el estado en memoria del
  formulario que las captura (registro, inicio de sesión, restablecer),
  viajan una única vez por HTTPS hacia Better Auth (que las procesa del lado
  del servidor) y no se escriben en AsyncStorage, SecureStore, SQLite ni
  ningún log.

---

## 27. Criterios para crear carpetas y componentes

Crear carpeta solo cuando:

- Agrupa elementos relacionados.
- Define un límite claro.
- La exige una herramienta.
- Existe crecimiento concreto.

Extraer componente cuando:

- Tiene responsabilidad reconocible.
- Se reutiliza.
- Reduce complejidad.
- Facilita pruebas.
- Representa diseño estable.

No crear carpetas vacías ni componentes sin beneficio real.

---

## 28. Estructura inicial mínima

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── overlays/
├── features/
│   ├── onboarding/
│   ├── transactions/
│   ├── categories/
│   ├── dashboard/
│   └── extras/
├── lib/
│   ├── storage/
│   └── auth-client.ts
├── navigation/
├── state/
│   ├── session/
│   └── activeSpace/
├── theme/
└── utils/
```

Las demás carpetas se añaden cuando el roadmap las necesita.

---

## 29. Principio final

> La arquitectura existe para que el cambio correcto sea fácil y el cambio incorrecto resulte evidente.

Si una estructura obliga a recorrer demasiadas carpetas para comprender una funcionalidad sencilla, debe simplificarse.
