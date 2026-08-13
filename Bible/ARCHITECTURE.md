# ARCHITECTURE.md

## 1. Objetivo

Este documento define la arquitectura técnica de `juntoss`, los límites entre capas y la estructura recomendada del repositorio.

Debe facilitar cambios pequeños, mantener juntas las piezas de una misma funcionalidad, evitar carpetas globales sin criterio, separar interfaz y persistencia, funcionar en iOS y Android y permitir modo invitado local y modo autenticado sincronizado.

---

## 2. Principio estructural

Todo el código fuente de la aplicación vive dentro de `src/`.

Fuera de `src/` permanecen:

- Configuración.
- Proyectos nativos.
- Assets requeridos por compilación.
- Supabase y migraciones.
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
├── supabase/
│   ├── migrations/
│   ├── seed/
│   ├── functions/
│   ├── tests/
│   └── config.toml
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

---

## 5. `src/navigation/`

```text
src/navigation/
├── RootNavigator.tsx
├── AuthNavigator.tsx
├── GuestNavigator.tsx
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
│   └── Toast/
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
├── guest/
├── transactions/
├── categories/
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
- Crash reporting.
- Notificaciones.
- Logging.
- Almacenamiento seguro.

### `src/lib/`

Adaptadores de librerías externas:

```text
src/lib/
├── supabase/
├── storage/
├── dates/
├── currency/
└── validation/
```

El resto de la app no debe depender directamente de detalles complejos de configuración de proveedores.

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

Mapa comparte un único modelo local de periodos, semanas y fechas entre sus
composiciones mensual y semanal. Ambas conservan listas virtualizadas acordes a
su geometría: los meses usan seis filas y una altura fija conocida; las semanas
pueden crecer con sus previews, por lo que la vista semanal comienza directamente
en la ventana del mes activo y precarga después el historial anterior completo
preservando la posición visible. La vista mensual reutiliza una instancia de
`Calendar` por mes sobre una `FlatList` nativa y mantiene una ventana adelantada
para que un desplazamiento rápido no alcance placeholders. La selección, los
límites, la identidad visual y
la transición de capa se reutilizan sin forzar offsets comunes entre elementos
de altura distinta. Las listas permanecen montadas y memoizadas; el coordinador
de foco ya existente adelanta la vista inactiva en intervalos de 100 ms y confirma
su posición mediante viewability. Al alternar vuelve a comparar el periodo activo
con el periodo realmente visible. El modelo compartido abarca de enero de 2024 a
diciembre de 2080.

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

Supabase, persistencia local, red y servicios externos.

Dirección preferida:

```text
UI -> aplicación/dominio -> repositorios -> infraestructura
```

Evitar:

```text
componente -> cliente Supabase -> tabla
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

El modo invitado y la migración local-nube justifican esta abstracción, pero no debe añadirse complejidad innecesaria antes de usarla.

---

## 16. Persistencia local y sincronización

Flujo conceptual:

```text
UI
  -> caso de uso
  -> repositorio seleccionado por sesión
      -> local, si invitado
      -> remoto o sincronizado, si autenticado
```

La estrategia detallada está en `DATABASE.md`.

El catálogo pequeño de espacios y el identificador activo continúan guardándose
mediante un repositorio encapsulado sobre AsyncStorage. Las categorías y los
movimientos usan SQLite mediante `expo-sqlite`, con migraciones versionadas y
repositorios dentro de cada feature. La interfaz conserva arrays de dominio para
presentación, pero restaura y confirma cada mutación a través del repositorio; no
accede directamente a SQLite. La elección y sus límites están registrados en
ADR-050.

La primera frontera remota vive en `src/lib/supabase/` y la coordinación de
migración en `src/features/sync/`. La UI no importa el cliente: una vez exista
sesión, llama al caso de uso autenticado, que prepara el lote SQLite, lo envía
mediante un gateway y confirma localmente los conteos. El esquema y el RPC
transaccional permanecen versionados en `supabase/`; ADR-059 documenta la
idempotencia y el bloqueo de cuenta equivocada.

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
- SQL en `supabase/tests/`.

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
- La autorización real vive en Supabase.
- El espacio activo visual no sustituye RLS.
- Ningún secreto entra en el bundle.
- Las operaciones destructivas son explícitas.
- Las contraseñas nunca se persisten: viven solo en el estado en memoria del
  formulario que las captura (registro, inicio de sesión, restablecer),
  viajan una única vez por HTTPS hacia Supabase Auth (que las hashea del lado
  del servidor) y no se escriben en AsyncStorage, SecureStore, SQLite ni
  ningún log. Ver ADR-074 en `DECISIONS.md`.

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
│   ├── guest/
│   ├── transactions/
│   ├── categories/
│   ├── dashboard/
│   └── extras/
├── lib/
│   ├── storage/
│   └── supabase/
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
