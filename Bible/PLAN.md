# PLAN.md

## 1. Propósito

Orden de trabajo para llevar `juntoss` de la alpha desordenada a una versión
publicable. Complementa a `ROADMAP.md`: aquel es el catálogo de fases de
producto; este es el orden operativo de las próximas semanas.

Principios rectores:

- Primero se retira la deuda de **bajo riesgo**; la estructural se toca **por
  contacto**, no como proyecto.
- La deuda ya está **congelada** por los checks (`eslint.config.js`, CI): no
  crece. No hay urgencia.
- Se **verifica antes de refactorizar**: lo único sin confirmar (sync y correo)
  puede reordenar todo lo demás.

## 2. Estado

Funcionalmente casi completa (arranque, onboarding, modo oscuro, núcleo
financiero, autenticación, importación, legal y espacios de pareja). La
**sincronización Supabase** y la **verificación de correo** ya se comprobaron de
punta a punta en staging con dos cuentas y dos dispositivos físicos (§§6-8).

La **Fase 3** está oficialmente cerrada tras la resolución del frente SQL y las ACL en staging. El trabajo activo avanza a la **Fase 4** de desarrollo funcional. La Fase 5 de release no ha comenzado. El macrobloque de integración legal (ADR-083) está implementado y pasó su Gate 1 (132 suites / 852 pruebas). El Gate 2 (ronda 1) rechazó cinco bloqueantes conductuales (B1–B5) y dos condiciones (C1–C2); quedaron corregidos con su tabla de transiciones y una prueba roja por bloqueante. La ronda 2 aportó B6–B8 (identidad del snapshot, sesión del OTP y ranura única de intención) y el veredicto conjunto de la ronda 3 aprobó B6 y B8 y rechazó B7 con dos rutas nuevas en `AuthModal`; la ronda 4 corrigió B7 de forma estructural —pausa gobernada solo por la fase, toda salida posterior al OTP por `cancelReset` y guards en `useRecoveryPhase`— con tres pruebas rojas de transición real. El veredicto de la ronda 4 rechazó B9 (terminación tras una cancelación fallida) e I1 (idempotencia no atómica); la ronda 5 los corrigió con `completeRecovery` y la publicación síncrona de la fase, y el de la ronda 5 rechazó B10 —la terminación se descartaba durante `canceling`—: la ronda 6 la encoló en `cancelingCompletion`; el veredicto de la ronda 6 rechazó B11 —el «resultado definido» asumía sesión viva pese al contrato real de GoTrue— y B12 (`cancelingCompletion` no era pegajosa): la ronda 7 define el ganador por el estado real posterior de la sesión (`getSession`: sesión `null` → cancelación; presente → terminación; desconocido → fallo seguro) y hace `cancelingCompletion` pegajosa frente a todos los escritores. El veredicto de la ronda 7 rechazó B13 —el anfitrión ejecutaba su destino de éxito antes de conocer al ganador de la carrera—: la ronda 8 encola la continuación junto con el estado, de modo que cada carrera termina en exactamente un destino. El de la ronda 8 rechazó B14 —el orden inverso: la cancelación podía ganar antes de que respondiera el guardado, y la terminación tardía ejecutaba un segundo destino—; la ronda 9 separa el desenlace del episodio de la fase. La validación del Gate 2 fue **136 suites / 903 pruebas** cuando el veredicto de la ronda 9 aprobó ADR-083 (B1–B14); en lugar de seguir parcheando la coordinación, el responsable ordenó el **rediseño ADR-084**: una máquina de episodio (reductor puro con la matriz completa 10×9 = 90 celdas) y un controlador único dueño de `setNewPassword`, `signOut('local')`, la identidad del episodio, la concesión de pausa y el destino. Regla: gana la primera operación **aceptada**; `saving` y `canceling` nunca coexisten, así que no hay carrera que arbitrar. La validación actual es **136 suites / 1007 pruebas** (seguir `Bible/DECISIONS.md` → ADR-084). El rediseño va con Claude como actor y un solo verificador (GPT); la revisión del verificador cerró B15 (desenlace por postcondición `getSession`), I1 (chrome deshabilitado durante `saving`) e I2 (la puerta ya no borra en global las concesiones). Falta el veredicto de la entrega y el smoke físico (con `enable_confirmations` activado en local para los pasos del OTP).

## 3. Orden de trabajo

### Fase 1 — Limpieza quirúrgica — [x] cerrada

- [x] Imports de librerías: `phosphor-react-native/src/icons/*` se conserva (API
  pública declarada en `exports`); los tipos de `react-native-calendars` se
  derivan del contrato público y se encapsulan en `AppCalendar` (ADR-079).
- [x] Consolidar los helpers de fecha duplicados en `src/lib/date/localDate.ts`
  (`toLocalDateKey` / `getLocalTodayKey`).
- [x] Limpiar configuración muerta (p. ej. `testPathIgnorePatterns` con `services/`).
- [x] Optimizar los assets de onboarding (~8,8 MB de PNG): comprimir o vectorizar.

### Fase 1b — Auditoría de supresiones de `exhaustive-deps` — [x] cerrada

Las 5 supresiones pueden esconder *closures* obsoletos (bugs reales). Es **caza
de bugs**, no limpieza: se auditan, se corrigen los defectos y se activa un check
con línea base para impedir nuevas supresiones.

**Resultado:** cinco supresiones auditadas, cuatro eliminadas, una documentada
y cubierta por tests (la de `ImportScreen.tsx`, snapshot intencional). Dos bugs
reales encontrados y corregidos: accesibilidad en F1 (`OnboardingRevealText`) y
catálogo obsoleto en la importación en F4 (`ImportScreen`). Check de línea base
anclado en `scripts/check-exhaustive-deps-suppressions.mjs`, integrado en
`npm run lint` y `validate`. Commits: `83ce86f`/`680f38b` (F1), `ef8e858` (F2),
`fe069e1` (F3), `e9cd5d5`/`5c19b3b` (F4), `9c4ca15` (helper y umbral),
`3e83bd7`/`f62d566` (check).

### Fase 2 — Spike: sincronización end-to-end + verificación de correo — [x] cerrada

La sync Supabase y la verificación de correo se comprobaron de punta a punta.
El spike reprodujo el fallo compartido y dimensionó la Fase 3 (§§6-8).

### Fase 3 — Producto: terminar lo que el spike reveló — [x] cerrada

Implementar lo que el spike demuestre que falta.

### Fase 4 — Desarrollo funcional del MVP final — en curso

Esta fase incorpora como **alcance obligatorio de producto** las capacidades
que Alphonzo propuso en la rama externa: autoría visible, perfiles y avatares de
miembros, cuentas de dinero y los ajustes visuales que superen revisión. Se
implementarán desde nuestros contratos y reglas; que una capacidad entre en el
MVP **no aprueba ni integra su código externo** (§9).

La Entrega 2 de monedas ya está cerrada. Antes de comenzar estas entregas
funcionales deben resolverse sus otros prerrequisitos:

- Resolución de la escala monetaria y decimales (ADR-080) antes de almacenar nuevos
  saldos iniciales de cuentas.
- Resolver explícitamente la contradicción de `category_budgets` y decidir, con
  inventario real, si hace falta reparar el backfill histórico que asumió EUR.
- Crear migraciones propias desde el siguiente número libre en nuestro
  repositorio; los números 24-35 de la rama externa no están reservados ni se
  copian.

#### Fase 4a — Autoría compartida

- Exponer en el modelo local y remoto quién creó cada movimiento.
- Diferenciar UUID autenticado e identificador de instalación de invitado sin
  atribuir a la persona equivocada durante la ventana de sincronización.
- Mostrar autor textual en tarjeta y detalle solo cuando aporte información.
- Conservar autoría al editar y definir su estado tras abandonar el espacio o
  eliminar la cuenta.
- Probar RLS, caché sin conexión y ambos sentidos de sincronización.

#### Fase 4b — Perfiles y avatares compartidos

- Permitir leer únicamente perfiles de miembros que comparten un espacio
  activo; una invitación pendiente no concede acceso.
- Diseñar bucket privado, miniaturas, límites, rutas, caché, reintentos,
  actualización y borrado de cuenta.
- Separar la identidad textual de la imagen: si Storage falla, el nombre y la
  autoría siguen funcionando.
- Verificar privacidad con usuarios ajenos y comportamiento real en iPhone y
  Honor.
- Incluir en el catálogo visible las monedas por defecto de los miembros del
  espacio, sin sustituir la precedencia vigente: moneda del espacio, moneda
  propia, preferencias de miembros y, por último, monedas presentes en los
  movimientos. La llegada asíncrona de perfiles no puede reiniciar un borrador
  abierto ni hacer parpadear el selector.

#### Fase 4c — Cuentas de dinero

- Definir mediante ficha y ADR saldo inicial con fecha, saldo actual frente a
  proyectado, transferencias, propiedad compartida y una o varias monedas por
  cuenta.
- Una transferencia entre cuentas propias no puede inflar ingresos y gastos.
- Nunca cambiar la divisa de un movimiento conservando el mismo importe sin
  conversión o confirmación explícita.
- Implementar en entregas separadas: modelo local y migración; SQL/RLS;
  sincronización y migración de invitado; consumo en movimientos; y UI en
  Actividad/Inicio.
- Exigir integridad por espacio, permisos de autor, pgTAP conductual, staging y
  pruebas financieras multidivisa en dos dispositivos.
- El diseño debe elegir una fuente de verdad para moneda, saldo inicial y
  balances; no se aceptan una moneda primaria y una fila de balance que puedan
  contradecirse. Las cuentas se archivan, no se borran silenciosamente.
- El selector de cuenta nunca puede cambiar la divisa de un movimiento
  conservando el mismo entero: debe bloquear, convertir con confirmación o
  crear/seleccionar un balance compatible.
- La primera entrega no incluye por defecto transferencias, asignación desde
  importación ni agregados entre monedas: cada una necesita contrato y pruebas
  propios antes de entrar en el MVP.

#### Fase 4d — Consolidación visual

- Revisar las propuestas externas sobre progreso de onboarding, botón flotante,
  fondo raíz y presentación de cuentas contra `PRODUCT.md` y el sistema de
  diseño.
- Resolver la presentación confusa de «Detalle por categoría» en Actividad. El
  listado y el donut que lo precede aparentan formar una sola vista, pero hoy
  divergen en tres estados:
  - **Modo (Gastos/Ingresos):** vive dentro de `CategoryDonutChart`; el listado
    recibe todos los resúmenes y no aplica ese modo.
  - **Mes:** el donut mantiene su propio `monthKey` y filtra con
    `listTransactionsByMonth`; el listado recibe `categorySummaries` calculado
    con el acumulado hasta el mes actual.
  - **Periodo efectivo:** como consecuencia, ambos bloques pueden representar
    rangos temporales distintos simultáneamente.
  Además, la regla vigente muestra el importe de categorías solo de ingreso,
  pero conserva una barra vacía y oculta el gasto de una categoría sin
  presupuesto aunque el donut sí lo contabilice. No es un fallo de datos ni de
  moneda. La decisión de producto debe cubrir la sincronización de modo, mes y
  periodo, además de la regla de importes: o ambos bloques comparten estado, o
  se separan visualmente para que no parezcan una misma vista.
- **Indicador de novedades en el selector de espacio:** Un punto cuando hay algo nuevo en un espacio que no estás mirando, calculado con una consulta ligera al abrir la app y al volver a primer plano. Sin suscripciones ni notificaciones flotantes (`JUNTOSS_NOTIFICATIONS.md` §19).
- Implementar solo las que tengan objetivo y criterio de aceptación; no portar
  el commit externo de «trabajo en curso».
- Evaluar y, si superan el criterio de aceptación, incorporar de forma propia:
  `AvatarPair`, autoría visible en tarjetas y detalles, secciones plegables de
  cuentas en Inicio/Actividad, resumen sticky, encabezados y filtros de
  movimientos, iconografía consistente, progreso y fondo del onboarding,
  `ModalCloseButton`, `SegmentedControl`, FAB/QuickCreate y estados vacíos.
- Estas piezas visuales son superficie de producto, no permiso para copiar
  componentes externos. Cada una requiere smoke en iPhone y Honor y debe
  respetar accesibilidad, movimiento reducido y los contratos monetarios.
- Hacer smoke visual y nativo en iOS y Android.

La reauditoría incremental de §9.6 añade candidatos, no implementaciones. Su
orden interno obligatorio es:

1. Unificar primero la semántica de modo, mes y periodo de Actividad.
2. Después incorporar preferencias de vista, plegado y animaciones, con
   movimiento reducido y sin parpadeo durante la carga asíncrona.
3. Consolidar primitivas (`SegmentedControl`, selector de apariencia, métricas,
   flechas e iconos) sin sustituir la paleta ni perder contraste.
4. Rediseñar el modal de movimientos sobre la API monetaria de ADR-080.
5. Tratar la edición rápida de categoría, cuenta, fecha y recurrencia como una
   entrega conductual separada, con regresiones de series y sincronización.
6. Evaluar encabezado global, scroll al inicio, onboarding y ciclo de vida de
   espacios como decisiones de producto independientes; no esconderlas dentro
   de un paquete visual.

#### Fase 4e — Copias entre espacios

- Mantener la copia de movimientos y añadir copia de categorías solo con
  contratos explícitos de destino.
- Una copia nunca conserva un `moneyAccountId` de otro espacio. El presupuesto
  de una categoría se limpia o se revalida según la moneda principal del
  destino; no se arrastra un número ambiguo.
- La copia conserva el original, exige una categoría válida del destino y
  confirma qué ocurre si las monedas no coinciden. Probar aislamiento por
  espacio, divisa y sincronización antes de publicarla.

#### Fase 4f — Internacionalización y locale (Obligatorio antes de release)

- Meta inicial español e inglés, con arquitectura extensible.
- Incluye interfaz, onboarding, categorías predeterminadas, errores, notificaciones, plantillas de correo y textos del backend.
- El `locale` fijo `'es-ES'` se sustituye; la selección del locale debe derivar de la arquitectura de idiomas, no al revés.
- Se completa **antes** de publicar en tiendas para evitar retrabajo transversal y lanzar una experiencia lingüísticamente coherente.

#### Fase 4g — Inicio de sesión con Google y Apple

Se amplía `supabaseAuthGateway` con los proveedores nativos de Supabase Auth.
**No se sustituye el proveedor de identidad**: `auth.uid()` sostiene todas las
políticas RLS, `handle_new_user`, `space_members`, los RPC de invitación y las
doce suites pgTAP. Clerk, Auth0 o Better Auth resolverían un problema que este
proyecto no tiene y obligarían a migrar ese cimiento (ADR pendiente).

- Usar el flujo de token nativo (`signInWithIdToken`), no el de navegador: evita
  el redirect por deep link, que hoy no funciona fuera de un development build.
- Google y Apple entran **juntos en iOS**: la directriz 4.8 de App Store obliga a
  ofrecer Sign in with Apple si se ofrece otro login social.
- Requiere development build (no funciona en Expo Go). Comparte ese bloqueo con
  el smoke de `AcceptInvitationScreen`: se resuelven en la misma tanda.
- Credenciales de plataforma: cuenta Apple Developer de pago con Service ID y
  clave; en Google, client IDs de iOS, Android y web más la huella SHA-1 de la
  clave de firma. Si EAS gestiona credenciales, fijarla: si cambia, el login cae
  en release y no en desarrollo.

Decisiones que se toman **antes** de implementar, no durante:

- **Enlace de identidades:** qué ocurre cuando quien se registró con correo y
  contraseña entra después con Google usando ese mismo correo. Enlazar o tratar
  como cuenta distinta; se decide y se prueba, no se hereda del comportamiento
  por defecto.
- **Nombre y avatar de Apple:** Apple entrega el nombre solo en la **primera**
  autorización y nunca más. Si no se persiste en ese momento, se pierde. Es
  prerrequisito real de la Fase 4b, que debe diseñarse con este dato en mano.
- **Alta y espacio personal:** `handle_new_user` también se dispara en registros
  por OAuth. Su verificación conductual pendiente tras la migración 25 deja de
  ser opcional.
- **Migración de invitado:** el camino invitado → cuenta debe funcionar igual
  desde un alta por OAuth.
- **Flujo legal:** pasa a tener **dos** caminos de alta que cubrir, no uno.
- **Alcance del bloqueo por intentos:** `login-with-lockout` no interviene en
  OAuth. La protección queda acotada a los inicios con contraseña y así debe
  declararse.

Toca autenticación: tarea grande, dos verificadores (`PROJECT_RULES.md` §4.3),
con pruebas en iPhone y Honor sobre un build real.

La Fase 4 termina cuando estas capacidades están implementadas, verificadas y
documentadas; no cuando existen commits externos que se les parezcan.

### Regla transversal — Descomposición por contacto

No se descompone un god component por estar en una lista: se descompone el día
que una tarea de producto obliga a entrar en él. `frozenLineDebt` marca qué
archivos no pueden crecer; cada refactor real retira su entrada. Excepción: si
un componente bloquea producto inminente, se descompone antes, con propósito.

**Candidato prioritario:** `AppCalendar.tsx`. El componente de día del
calendario (`ScrollCalendarDay` y su tipado derivado, ADR-079) es lo primero que
debe extraerse la próxima vez que una tarea de producto lo toque. Su umbral
congelado se elevó a 565 con aprobación explícita del responsable; es el nuevo
techo y solo puede bajar.

**Candidato prioritario:** `ImportScreen.tsx`. Dos excepciones sobre el mismo
archivo dejan de ser casualidad: su umbral congelado se elevó (fix del stale
closure del catálogo, Fase 1b/F4) y alberga la única supresión de
`exhaustive-deps` que permite el check de línea base. Es el siguiente candidato
a extracción cuando una tarea de producto lo toque.

### Fase 5 — Release — no iniciada

- Prueba real en dispositivo iOS y Android (safe areas, teclado, gestos, modo
  oscuro real) — `PROJECT_RULES.md` §10.
- [ ] Smoke test físico (iPhone/Honor) de `AcceptInvitationScreen` (deep link `juntoss://` desde verificación de correo), pendiente de un development build.
- Build EAS, cuentas de tienda, política de privacidad accesible.
- [ ] **Flujo legal previo al release implementado (ADR-083), pendiente de smoke físico y verificadores.** El flujo quedó cerrado en el macrobloque de cierre de la integración legal: `recordLegalAcceptance` ya tiene consumidores, la puerta de sesión exige evidencia de las versiones vigentes (invitados exceptuados), el registro pide las dos acciones diferenciadas antes de crear la cuenta y persiste una intención durable que el OTP consume. El Gate 2 corrigió B1–B5/C2 en la ronda 1 (134/866) y la ronda 2 rechazó tres bloqueantes nuevos con la misma causa de fondo —estado global sin dueño—: B6 (el `cleared` no guardaba de quién era la sesión), B7 (cancelar la recuperación dejaba viva la sesión del OTP) y B8 (la intención durable se pisaba por un correo único). Los tres se corrigieron con prueba roja previa por defecto y evidencia con `COMANDO` + `EXIT=`; el veredicto conjunto de la ronda 3 aprobó B6 y B8 sin reservas y rechazó B7 con dos rutas nuevas en `AuthModal` (Atrás desde reset sin `cancelReset`, y cierre manual que despausaba por orden de efectos). La ronda 4 corrigió B7 de forma estructural —la pausa deriva solo de la fase de recuperación, toda salida posterior a la sesión del OTP pasa por `cancelReset` y el hook blinda las transiciones— con tres pruebas rojas nuevas de transición real y `signOut('local')` diferido. El veredicto de la ronda 4 (GPT) rechazó la entrega por B9 (guardar la contraseña después de una cancelación fallida dejaba el cierre por éxito incoherente) e I1 (`cancelReset` no era atómicamente idempotente); la ronda 5 los corrigió añadiendo `completeRecovery` (terminación confirmada: `inactive` sin `signOut`, atraviesa `cancelError`) y la publicación síncrona de la fase, con una prueba roja por anfitrión y una directa del hook. El veredicto de la ronda 5 aprobó B9 e I1 pero rechazó B10 —la terminación se descartaba (no-op) durante `canceling`—: la ronda 6 la encoló en `cancelingCompletion`; el veredicto de la ronda 6 rechazó B11 —el «resultado definido» asumía sesión viva, pero `GoTrueClient._signOut` elimina la sesión local con éxito y en la mayoría de errores, y los mocks de resolve/reject no reproducían el cambio de sesión— y B12 —`cancelingCompletion` podía sobrescribirse con `startRecovery`—. La ronda 7 define el ganador por el estado real posterior (`getSession`): sesión `null` → ganó la cancelación (`inactive` + `onCanceled`); sesión presente → ganó la terminación (`inactive`, sin `onCanceled`); estado desconocido → `cancelError` seguro; y hace `cancelingCompletion` pegajosa frente a todos los escritores, con pruebas fieles que reproducen la eliminación de la sesión en la invitación (no se autoacepta si ya no existe; sí solo con sesión viva) y contrato directo del hook. El cierre forzado de `AuthModal` ya no re-llama `cancelReset` con una cancelación en vuelo, y el cierre por éxito sigue documentado como transición distinta (`requestClose` es solo el camino de cancelación hacia `onClose`). El veredicto de la ronda 7 rechazó B13: con una cancelación en vuelo, el anfitrión ejecutaba su destino de éxito (cerrar el modal, navegar a login) nada más encolar la terminación, sin esperar al ganador —dos destinos si ganaba la cancelación, y un `cancelError` invisible con reintento automático oculto si `getSession` fallaba—. La ronda 8, con Claude como actor y excepción registrada de un solo verificador (§4.3), encola la continuación junto con el estado: `completeRecovery(onCompleted?)` la guarda y la resolución ejecuta exactamente un destino, con la marca encolada fuera de la fase para que sobreviva a `cancelError`. El veredicto de la ronda 8 rechazó B14: `cancelReset` podía resolver antes que `setNewPassword`, y el `onSuccess` tardío —que `ResetPasswordScreen` invoca sin guarda de desmontaje— ejecutaba un segundo destino porque `inactive` no distinguía «sin recuperación» de «episodio ya resuelto». La ronda 9 separó el desenlace con `outcomeSettledRef`, y **ADR-084 reemplazó el mecanismo por completo**: máquina de episodio (reductor puro, matriz 10×9) + controlador único (`usePasswordRecoveryFlow`) dueño del guardado, del `signOut('local')`, de la identidad del episodio, de la concesión de pausa (`recoveryHoldRegistry`, con dueño a nivel de módulo) y de un único destino; `ResetPasswordScreen` quedó controlada y los tres hosts sin efectos de recuperación. Regla: gana la primera operación aceptada; `saving` y `canceling` nunca coexisten. El precio deliberado (sin timeout): mientras guarda no se puede cancelar, volver ni cerrar. La validación actual es **136 suites / 1007 pruebas / EXIT=0**. La revisión del verificador cerró B15 (el desenlace de la cancelación se decide por la postcondición `getSession`, no por el éxito/fallo del `signOut`), I1 (el chrome «Atrás» queda `disabled` accesible mientras `saving`) e I2 (la puerta dejó de borrar en global las concesiones). Queda pendiente: el veredicto de la entrega (GPT, verificador único — excepción §4.3) y, solo después, el smoke físico (checklist entregado en el macrobloque, recuperación de contraseña incluida y `enable_confirmations` activado en local para los pasos del OTP), además de verificar que App Store Privacy y Google Play Data Safety coinciden con el comportamiento real. Deuda técnica de tests documentada en ADR-084: `useLegalSessionGate.test` y `AddFirstTransactionStep.test` dependen del orden con `--randomize` y son preexistentes al rediseño.
- Revisar la licencia y las vulnerabilidades de `xlsx`: es de **runtime**
  (importación) y `npm audit` le marca prototype pollution + ReDoS **sin fix**.
- Revisar `npm audit` (29: 13 moderadas, 16 altas); el resto son tooling de
  build de Expo (`image-size`, `postcss`, `uuid`, `js-yaml`) y en su mayoría se
  resuelven subiendo de SDK de Expo (cambio mayor, diferido).

### Deuda técnica previa a release (sin corregir todavía)

- **Higiene de tests — avisos `act(...)`:** La investigación apunta a la interacción React 19 + RTL 14 + `jest-expo` a nivel de reconciliador. Requiere alineación de versiones o deduplicación del reconciliador.
- **Catches silenciosos de reglas de notificación en `MainTabsNavigator`:** Se deben auditar los `.catch(() => undefined)` en la recarga, carga inicial y escrituras/recordatorios. Al abordarlo, decidir qué silencios son deliberados y cuáles pasan a `console.error` estructurado.

## 4. Reglas

- **Migraciones:** no renumerar nunca una migración ya aplicada. El hueco de la
  migración 09 se investiga (¿se aplicó en algún entorno?) y se documenta; no se
  rellena a ciegas.
- Cada cambio mantiene `npm run validate` en verde y se commitea atómico.
- Las pruebas en dispositivo forman parte de la definición de terminado, no son
  opcionales.

---

## 5. Reportes pendientes (recibidos 2026-08-15, sin abordar)

### Fase 2 — entran en el alcance del spike

- [x] **Las categorías y los movimientos compartidos no funcionaban.** El spike
  lo reprodujo con dos cuentas reales y aisló el bloqueo de SQLite en
  `restoreRemoteAccount`; la corrección quedó verificada en ambos sentidos con
  iPhone y Honor, sin duplicación (§§6-8, commit `5909098`).

### Fase 3 — producto, pendientes de dimensionar

- [x] **Cerrar el consumo multidivisa sin presentar importes como euros por
  defecto.** El modelo y la mayor parte de la interfaz ya están implementados:
  `spaces.currency` es la fuente del espacio, los agregados filtran por moneda
  y el catálogo visible es común a Inicio y Actividad. Los lotes reanudados con
  `currency = null` ya están corregidos (`a0eb3fe`), la evidencia diferencial
  asimétrica está capturada (rojo en `dcb5d8a` / verde en HEAD) y el reset de
  staging está ejecutado y verificado. El reinicio espontáneo del borrador de
  movimiento quedó corregido y revisado (`326fd07`, `277dc30`, `8249fbc`); los
  smokes finales en iPhone y Honor confirmaron el comportamiento multidivisa,
  presupuestos, sincronización y worklets (§8.4, §6).

- [x] **Registrarse con un correo ya usado no avisa de nada** y el usuario
  espera un código que nunca llega. El silencio es deliberado: responder igual
  ante correo nuevo y ya registrado evita que cualquiera averigüe qué correos
  tienen cuenta. La corrección no es «decir que ya existe», sino cerrar la
  espera sin revelar nada.

  **Decisión del responsable (2026-08-17): opción A.** La pantalla de
  verificación explica que, si ese correo no tenía cuenta, llegará un código, y
  que si ya la tenía debe iniciar sesión o recuperar la contraseña, con ambos
  accesos directos y visibles. Solo cliente: no se tocan el gateway, las
  plantillas de correo ni las Edge Functions.

  La opción B —enviar además un aviso real al titular de la cuenta existente—
  queda registrada como posible evolución. Exige flujo propio en backend y su
  propia decisión.

  Es tarea **grande**: toca autenticación y navegación, y `PROJECT_RULES.md`
  §4.3 lista ambas como grande. La clasificación previa de mediana fue un error
  de clasificación del responsable, corregido el 2026-08-18: grande exige
  **dos verificadores en paralelo** más el smoke físico iPhone/Honor. Antes de
  dimensionar hay que inventariar los tres anfitriones de `VerifyCodeScreen`
  —acceso, modal de ajustes e invitación—; el de invitación no disponía de
  recuperación de contraseña completa, hueco cerrado en esta entrega.

  **(Implementada)** Tarea 4 con implementación y Gate 2 aprobados. El smoke test
  de `AcceptInvitationScreen` ha sido trasladado a la fase de release por requerir
  development build para el deep link `juntoss://`. No se marca la verificación manual de `AcceptInvitationScreen` como realizada aún.
  Inventario de anfitriones completado: `AccessScreen`,
  `AuthModal` y `AcceptInvitationScreen` alojan `verify-signup` y cablean la
  cadena de recuperación (`forgot` → `ForgotPasswordScreen` →
  `verify-recovery` → restablecimiento). En invitación, `LoginScreen` recibe
  `onNavigateToForgotPassword` y la máquina `authStep` gana `forgot`,
  `verify-recovery` y `reset`, reutilizando las tres pantallas existentes según
  el precedente de `AccessScreen`. `VerifyCodeScreen` declara sus props como
  unión discriminada por `purpose`: `purpose="signup"` exige `onGoToLogin` y
  `onGoToRecovery`, y `purpose="recovery"` no los acepta; en registro muestra la
  explicación neutral («si no tenía cuenta te llegará un código; si ya tenía
  una, no recibirás uno aquí») con los accesos a iniciar sesión y recuperar
  contraseña. No queda rama muerta ni salida textual: un anfitrión futuro que
  monte el registro sin cablear la recuperación falla en typecheck. El ítem 13
  de la cola queda absorbido por esta tarea.

  Evidencia: casos de opción A en `VerifyCodeScreen.test.tsx` (registro exige
  ambos accesos; recuperación no los muestra); pruebas de integración del
  cableado de los tres anfitriones —`AccessScreen.test.tsx`,
  `AuthModal.test.tsx` y `AcceptInvitationScreen.test.tsx`— que demuestran que
  los tres llegan a `forgot`/`verify-recovery`/`reset`: en invitación, iniciar
  sesión desde la verificación vuelve al login, recuperar desde la verificación
  entra en `forgot` y recuperar desde el login recorre la cadena completa.
  Se corrigió el defecto de la sesión creada por el OTP, con la pausa explícita:
  éxito → una aceptación, cancelación → `signOut('local')` + login + cero
  aceptaciones, error al cerrar → subflujo conservado + cero aceptaciones; la
  evidencia diferencial corregida.
  `npm run validate` en verde: 125 suites / 757 tests. Commits: `195e916`
  (implementación inicial), `b99d49c` (correcciones y pruebas), `eafb1ed`
  (documentación), `31f4f2f` (unión discriminada y cableado de invitación),
  `c382d0c` (pausa explícita, cierre local y pruebas iniciales), `de29858`
  (corrección del orden temporal sesión → éxito de verificación, más
  documentación) y el commit resultante de esta actualización documental.

### Sin fase asignada — tarea pequeña

- [x] **Poder ver la contraseña mientras se escribe.** Aplica a registro,
  inicio de sesión y recuperación; usar la primitiva de campo existente, no un
  control nuevo por pantalla. **(Cerrada)** Tarea 3 implementada, verificada y cerrada con smoke iPhone/Honor exitoso.
  `AuthTextField` (la primitiva existente) gana un botón de visibilidad
  (`Eye`/`EyeSlash`, peso regular) que alterna `secureTextEntry`; estado inicial oculto;
  botón deshabilitado cuando el campo no es editable; sin cambios en los **cinco**
  campos de contraseña (`LoginScreen` ×1, `SignUpScreen` ×2, `ResetPasswordScreen` ×2).
  Evidencia roja/verde: `AuthTextField.test.tsx` nueva — ROJO contra el componente
  original (4 de 6 casos fallan, el botón no existe) y VERDE tras el cambio.
  Corrección del gate (2026-08-18): eran cinco campos, no seis, y se añaden las
  dos pruebas de aceptación que faltaban — revelar un campo no revela otro campo
  de contraseña simultáneo, y al desmontar y volver a montar reaparece oculta
  (8 casos en total). `npm run validate` en verde: 125 suites / 749 tests.
  Commit `f433f4f` (implementación inicial).

### Fase 3 — Frente SQL final — [x] cerrada

- [x] **Resolución de la deuda pgTAP de Fase 2a**.
  **Decisión puntual del responsable (2026-08-19):** Por indisponibilidad temporal de Claude, esta tarea tendrá excepcionalmente un único verificador (GPT). No modifica la regla general de `WORKFLOW.md`. La tarea se clasifica como grande al tocar SQL.
  - Se autorizó e impulsó a staging únicamente `24_revoke_public_execute.sql` y `25_revoke_remaining_public_execute.sql`.
  - Las aserciones estructurales que fallaban remotamente por limitación de `information_schema` fueron refactorizadas a consultas portables usando `pg_attribute` (`attnum > 0 AND NOT attisdropped`).
  - Se reconciliaron las seis funciones SECURITY DEFINER auditadas (y explícitamente `authenticated` en funciones críticas como `handle_new_user`). Únicamente `get_space_invitation_preview` conserva ejecución anónima intencional.
  - Se cerraron los permisos explícitos en `legal_acceptances` concediendo a `authenticated` exclusivamente `SELECT` e `INSERT`.
  - **Aplicación y Verificación en Staging (`blaanqqxtdezsscdkkvz`):**
    - Dry-run propuso únicamente la migración 25 (código de salida 0).
    - `npx supabase db push --linked` aplicado con éxito (código de salida 0).
    - Suite de validación en staging (`npx supabase test db --linked`) completada con éxito: 12 suites / 174 aserciones PASS.
    - Validación global (`npm run validate`): EXIT=0, 125 suites / 757 tests; permanecen los avisos conocidos del ítem de investigación act(...).
  - La deuda pgTAP de Fase 2a queda oficialmente **Cerrada**.
---

## 6. Verificaciones manuales registradas

Las casillas `[x]` que dependen de una verificación manual (`WORKFLOW.md` §4)
apuntan aquí: la evidencia debe quedar **anotada** en el repositorio, no solo
realizada y comunicada por chat. Cada tarea con componente visual añade una fila
cuando el responsable confirma el resultado.

| Fecha | Qué se verificó | Plataforma | Quién | Resultado |
|---|---|---|---|---|
| 2026-08-15 | Nueve láminas de onboarding tras la optimización lossless | iPhone 17 físico (iOS) | responsable | correctas, sin halos ni transparencias rotas |
| 2026-08-16 | Smoke de «Reducir movimiento» en OnboardingRevealText (3 casos: off / on antes / on durante) | iPhone 17 físico (iOS) | responsable | correcto en los tres casos; **no verificado en Android** — excepción aceptada por el responsable |
| 2026-08-16 | Sincronización en caliente (iPhone 17 → Honor) en espacio «Juntos» tras corrección de restoreRemoteAccount | iPhone 17 físico (iOS) y Honor Android | responsable | correcto (~2 s, inferido por latencia incompatible con sondeo de 15 s; sin duplicación tras ciclo de sondeo y recarga) |
| 2026-08-16 | Sincronización en caliente (Honor → iPhone 17) en espacio «Juntos» tras corrección de restoreRemoteAccount | Honor Android y iPhone 17 físico (iOS) | responsable | correcto (~2 s, inferido por latencia incompatible con sondeo de 15 s; sin duplicación tras ciclo de sondeo y recarga) |
| 2026-08-16 | Sincronización tras cambio de espacio (personal → «Juntos») con movimiento pendiente | iPhone 17 físico (iOS) y Honor Android | responsable | correcto (~2 s al cambiar de espacio, sin pérdida de información) |
| 2026-08-18 | Smoke multidivisa final de Entrega 2: espacio VES con preferencias VES/EUR, borrador de movimiento, creación/importación, presupuesto y sincronización | iPhone 17 físico (iOS) y Honor Android | responsable | correcto; la moneda elegida ya no se reinicia al escribir, borrar o recibir recargas; los gastos EUR no consumen el presupuesto VES y la sincronización conserva monedas sin duplicar |
| 2026-08-18 | Smoke nativo de gráficas/worklets de Entrega 2 | iPhone 17 físico (iOS) y Honor Android | responsable | correcto en ambas plataformas, sin bloqueos ni parpadeos persistentes atribuibles a los worklets |
| 2026-08-19 | Smoke de mostrar/ocultar contraseña en `AuthTextField` (inicio de sesión, registro con dos campos y restablecimiento) | iPhone 17 físico (iOS) y Honor Android | responsable | correcto: empieza oculta, el ojo alterna, el texto se conserva, los campos son independientes entre sí y no hay interferencia de teclado, cursor ni autorrelleno |

---

## 7. Informe de Fase 2 — Spike de sincronización end-to-end

### Fase 2a — Backend limpio (staging)

#### 1. Proyecto y CLI
- **Versión de CLI:** Supabase CLI `2.114.0` (vía `npx supabase`).
- **Vinculación:** Proyecto staging enlazado exitosamente (`supabase link --project-ref blaanqqxtdezsscdkkvz` contra PostgreSQL `17.6.1.155`).

#### 2. Migraciones
- **Total ejecutadas:** 21 archivos de migración (`01`–`08` y `10`–`22`).
- **Hueco migración 09:** Conservado intacto.
- **Dry-run previo:** `supabase db push --dry-run` finalizado con éxito (código de salida 0).
- **Aplicación real:** `supabase db push` completó las 21 migraciones sin errores (código de salida 0).
- **Historial verificado (`schema_migrations`):** 21 versiones locales registradas exactamente en remoto (`01`–`08`, `10`–`22`).

#### 3. Conformidad pgTAP y pruebas de base de datos
- **Estado general:** Backend desplegado y funcional, pero la conformidad pgTAP no se superó: 11 suites, 132 aserciones declaradas, código de salida distinto de cero, con deuda de prueba obsoleta y permisos PUBLIC EXECUTE pendientes.
- **Extensión:** Habilitada explícitamente en staging (`CREATE EXTENSION IF NOT EXISTS pgtap;`).
- **Ejecución:** `npx supabase test db --linked supabase/tests/`
- **Código de salida:** `1`
- **Resumen literal del ejecutor:**
  ```text
  Files=11, Tests=133, 48 wallclock secs ( 0.10 usr  0.04 sys +  0.13 cusr  0.12 csys =  0.39 CPU)
  Result: FAIL
  error running container: exit 1
  ```
- **Desglose de suites:**
  - **Aprobadas (6 suites):**
    - `category_budgets.test.sql`: ok (10 tests)
    - `couple_space_constraints.test.sql`: ok (7 tests)
    - `finance_schema.test.sql`: ok (12 tests)
    - `login_attempts.test.sql`: ok (4 tests)
    - `notification_rules.test.sql`: ok (6 tests)
    - `rls_policies.test.sql`: ok (12 tests)
  - **Con fallos (5 suites):**
    - `account_deletion.test.sql`: Fallos 2, 4-6, 13-14 (test 2 por `EXECUTE` a `PUBLIC`; 4-6 y 13-14 por comprobación de nulabilidad sobre vistas de esquema).
    - `couple_space_sync.test.sql`: Fallo 3 (`an anonymous caller cannot invoke the couple-space sync RPC` debido a que Postgres concede `EXECUTE` a `PUBLIC` por defecto y la migración 07/18 revoca de `anon, authenticated` sin revocar de `PUBLIC`, heredando `anon` dicho privilegio).
    - `import_learning.test.sql`: Fallo 17 (`items preserve their local review selection`).
    - `legal_acceptances.test.sql`: Fallo 7 (`not even the owner can delete acceptance evidence directly`).
    - `space_invitations.test.sql`: Fallos 10, 16-17, 22, 25 (fallo 10 por buscar índice antiguo `space_invitations_one_pending_per_space_idx` sustituido en migración 16 por `space_invitations_one_pending_per_target_idx`; 16-17 por permisos `PUBLIC`; fallo de plan por 24 declarados vs 25 ejecutados).

#### 4. Edge Functions
- **Función desplegada:** `login-with-lockout` desplegada a staging vía `supabase functions deploy login-with-lockout` (código de salida 0).
- **Modo JWT:** Verificación de JWT por defecto preservada (sin `--no-verify-jwt`).
- **Autenticación en cliente:** Clave publicable utilizada de clase `sb_publishable_...`.
- **Smoke test funcional:**
  - Invocación con clave publicable y credencial errónea respondió HTTP 401 `{"error":"invalid_credentials"}`.
  - Tabla `public.login_attempts` incrementó `failed_count = 1` y `last_attempt_at` de forma atómica en Postgres. Fila de prueba eliminada tras verificación.

#### 5. Lo que no estaba en el repositorio y requirió configuración manual
1. **Instalación/Enlace de CLI:** Requirió inicio de sesión interactivo y enlace explícito a `blaanqqxtdezsscdkkvz`.
2. **Configuración de Autenticación en Dashboard:**
   - Habilitación de Email/Password y confirmación obligatoria por correo.
   - Desactivación de CAPTCHA (la app móvil no envía token de captcha).
   - Ajuste de plantillas de correo «Confirm signup» y «Reset password» para usar `{{ .Token }}` (código OTP de 6 dígitos) en lugar de enlaces.
   - Configuración de proveedor SMTP propio (contraseña de aplicación de Gmail con remitente verificado).

---

### Fase 2b — Protocolo de reproducción y diagnóstico por capas

#### Paquete de commits evaluado
Commits de Fase 2: `5e6bc8b` a `81ab049`, ambos inclusive. Las pruebas en los dispositivos se ejecutaron sobre `49d9e28`; los posteriores son documentales.

#### Ficha de dispositivos
- **Dispositivo A (Usuario A):** iPhone 17 (iOS) | Commit `49d9e28` | Expo Go.
- **Dispositivo B (Usuario B):** Honor (Android) | Commit `49d9e28` | Expo Go.

#### Paso 1: Autenticación y verificación de correo
- **Acción UI:**
  - Registro de Usuario A en Dispositivo A y Usuario B en Dispositivo B con correos reales.
  - Recepción de correos con código OTP de 6 dígitos vía SMTP propio.
  - Verificación e inicio de sesión exitoso en ambos dispositivos.
- **Observación por capas en backend:**
  1. `auth.users`: Creados ambos registros con `email_confirmed_at` completado.
  2. `public.profiles`: Fila existente con `display_name` (el trigger `on_auth_user_created` se dispara al insertar en `auth.users`).
  3. `public.spaces`: 0 filas remotas. Observación: el registro inicial no aprovisiona un espacio personal remoto en Supabase (los datos iniciales viven en SQLite local hasta que se invoque la migración de datos de invitado).

#### Paso 2: Creación, invitación y aceptación de espacio Juntos
- **Acción UI:**
  - Usuario A crea espacio «Juntos» en Dispositivo A e invita a Usuario B por correo.
  - Usuario B recibe y acepta la invitación en Dispositivo B.
- **Observación por capas en backend:**
  1. `public.spaces`: Espacio `couple` activado (`activated_at IS NOT NULL`, poblado con `now()`).
  2. `public.space_invitations`: Invitación actualizada a `status = 'accepted'` con `accepted_by` y `accepted_at`.
  3. `public.space_members`: 2 miembros activos con rol `owner` y `space_type = 'couple'`.

#### Paso 3: Sincronización de categorías y movimientos (diagnóstico por capas)
- **Acción UI:**
  - Usuario A registra en Dispositivo A (iPhone) la categoría «Salario» y un ingreso de 40.00 VES en el espacio «Juntos».
  - Usuario B en Dispositivo B (Honor) observa que el ingreso no aparece automáticamente en la pantalla.
- **Trazabilidad estricta por capas:**
  1. **Capa 1 (SQLite local Dispositivo A):** Correcto. Entidades creadas en base de datos local.
  2. **Capa 2 (Invocación RPC `sync_couple_space_data`):** Correcto. Subida completada sin excepciones y con preservación de identificadores.
  3. **Capa 3 (Postgres remoto en Staging):** Correcto. Filas materializadas en servidor:
     - `public.categories`: ID `fa8d0f30-3ef6-4915-b289-a6d7b1ccf8be` («Salario»), `space_id: b69578f8-5269-4162-b36d-636c78638c45`.
     - `public.transactions`: ID `ae79124f-ad2a-4d51-b27e-e64aea0eccdc` (40.00 VES, `income`), `category_id: fa8d0f30...`, `space_id: b69578f8...`.

#### Paso 4: Aislamiento en el segundo dispositivo (Honor)
- **Pruebas de interacción manual ejecutadas en el Honor:**
  1. App en primer plano en espacio Juntos durante >20s: el ingreso no aparece (descarta fallo exclusivo de Realtime, ya que el intervalo de 15s en `src/navigation/MainTabsNavigator.tsx:445-447` tampoco lo trajo).
  2. Pase a segundo plano y retorno (evento foreground): el ingreso no aparece.
  3. Cambio de espacio a Personal y regreso a Juntos: el ingreso no aparece.
  4. Recarga completa de la app en Expo Go (Reload): el ingreso no aparece.
- **Aislamiento en Capa 5 (Servicio `restoreRemoteAccount`):**
  - Una vez que la transacción adquiere escritura, Expo SQLite documenta que las escrituras desde otra conexión abortan con `database is locked`. El código viola ese contrato; el mensaje literal no fue capturado porque la excepción se silencia en `src/navigation/MainTabsNavigator.tsx:333`.
  - Al inspeccionar el código de `src/features/sync/services/restoreRemoteAccount.ts:81`, se inicia una transacción exclusiva SQLite (`database.withExclusiveTransactionAsync(async (transaction) => { ... })`).
  - Dentro de esa transacción, las líneas 85, 90 y 173 invocan `findLocalIdForRemoteEntity` y `linkRemoteEntity` (`src/features/sync/repositories/localRemoteEntityLinkRepository.ts:38`), las cuales ejecutan consultas sobre la instancia global `database` en lugar del handle `transaction` activo.
  - Auditoría de los 19 bloques `withExclusiveTransactionAsync`: cero casos adicionales. No se justifica una reforma transversal de repositorios.

#### Paso 5: Prueba en sentido B → A y verificación de monedas
- **Acción UI:**
  - Usuario B (Honor) registra en el espacio «Juntos» la categoría «Compras» y un ingreso de 80.00 VES.
  - Usuario A (iPhone) no visualiza el movimiento registrado por Usuario B.
- **Observación en base de datos remota (Postgres):**
  - La subida desde el Honor funcionó al 100%: `public.categories` contiene la categoría «Compras» (`b9215993-660b-45ae-9170-72f1f108c19a`) y `public.transactions` contiene el ingreso de 8000 céntimos (`8650c205-146a-4e24-a613-367acbc8a52c`, currency `VES`).
  - **Descarte de hipótesis de monedas:** La moneda `VES` es aceptada por la restricción `currency ~ '^[A-Z]{3}$'` y persistida correctamente en Postgres y SQLite local.
- **Conclusión del diagnóstico:**
  - La subida (`sync_couple_space_data`) opera correctamente de forma bidireccional (iOS → Postgres y Android → Postgres).
  - La sincronización descendente (`restoreRemoteAccount`) falla de forma simétrica en ambos dispositivos debido al bloqueo de concurrencia SQLite dentro de `withExclusiveTransactionAsync`.

### Verificación tras la corrección de `restoreRemoteAccount`

- **Ambos sentidos correctos.** Un movimiento creado en un dispositivo aparece en el otro en ~2 segundos, con el espacio «Juntos» activo en el receptor.
- **Sin duplicación** tras esperar otro ciclo de sondeo y reiniciar la app.
- La latencia observada (~2 s) es incompatible con el sondeo de 15 segundos, por lo que se infiere que la entrega ocurrió por Realtime. **Es una inferencia por tiempos, no observación directa del canal.** Realtime no presenta un segundo defecto.
- **Cierre de la hipótesis 4 de la Fase 2:** Con el receptor situado en su espacio personal, un movimiento creado en el otro dispositivo aparece ~2 segundos después de cambiar al espacio «Juntos». La restauración al cambiar de espacio funciona y **no se pierde información**. La suscripción Realtime está acotada al espacio activo por diseño (`space_id=eq.${activeSpace.id}`); el hueco restante es de **aviso**, no de datos.

---

## 8. Ficha de Fase 3 — Corrección de `restoreRemoteAccount`

### 1. Ficha de tarea
- **Clasificación:** Mediana (toca restauración de datos financieros → dos verificadores).
- **Objetivo:** Que todos los accesos a SQLite dentro de la transacción exclusiva en `restoreRemoteAccount` utilicen el handle `transaction`.
  - Afecta a las llamadas de las líneas 85, 90 y 173 en `src/features/sync/services/restoreRemoteAccount.ts`.
  - `linkRemoteEntity` y `findLocalIdForRemoteEntity` (`src/features/sync/repositories/localRemoteEntityLinkRepository.ts`) deben poder recibir el executor transaccional, y `linkRemoteEntity` no puede reconsultar por la conexión global al final.
- **Llamadas de las líneas 43 y 51 (`restoreRemoteAccount.ts`):** Conservan su comportamiento fuera del bloque exclusivo. Se permiten los ajustes mecánicos de firma que exija hacer obligatorio el executor, pero **no se trasladan dentro del bloque exclusivo** ni cambia su semántica.
- **Estrategia de pruebas automáticas:**
  - **Prueba estructural (`src/features/sync/services/restoreRemoteAccount.test.ts`):** Verifica que dentro de la restauración todos los accesos a `remote_entity_links`, categorías y movimientos usen estrictamente el mismo handle `transaction`.
  - **Ejecución previa (TDD Red):** Falló contra el código original demostrando el defecto (2 llamadas de `INSERT INTO remote_entity_links` para categorías y transacciones cayeron indebidamente en la conexión global `database`).
  - **Ejecución posterior (TDD Green):** Pasa al 100% tras hacer obligatorio `LocalSqlExecutor` y propagar `transaction`.
  - **Validación global (`npm run validate`):** 117 suites de Jest pasadas (673 tests), typecheck y linters en verde.
- **Commit:** `5909098` (`fix(sync): propagar executor transaccional obligatorio en restoreRemoteAccount`).
- **Verificación real en dispositivos:**
  - Tras el arreglo, se repitió el protocolo en los dos teléfonos (A → B y B → A):
    - Movimientos y categorías recibidos en caliente en ~2 segundos (inferido por latencia incompatible con el sondeo de 15 s; sin duplicación tras ciclo de sondeo y recarga).
    - Verificada la no duplicación tras recarga (registrado en §6, commit `b34c30b`).
- **Fuera de alcance:**
  - Todo lo demás. En particular, no dejar de silenciar los errores de restauración en `src/navigation/MainTabsNavigator.tsx:333`; es un cambio de comportamiento distinto y va en tarea separada.

### 2. Tarea 1 de Fase 3 — Des-silenciamiento en `MainTabsNavigator.tsx:325, 333` (Cerrada)
- **Objetivo cumplido:** Se reemplazaron los bloques `catch {}` vacíos de `syncCoupleSpaceDataForCurrentSession` (línea 325) y `restoreRemoteAccountForCurrentSession` (línea 333) por `console.error` estructurado.
- **Alcance acotado:** La línea 352 (`publishCoupleSpaceChanges(...).catch(() => undefined)`) permanece intacta y se registra como tarea independiente en la cola para no ampliar el alcance sin autorización explícita.
- **Evidencia automatizada:** Verificado en suite de pruebas unitarias (`src/navigation/MainTabsNavigator.test.tsx`), comprobando que se registra el error tanto en fallo de subida como de restauración, que el error no se propaga al usuario y que los datos locales continúan accesibles.

### 3. Inventario técnico para la replanificación de Tareas 2 y 3 (Monedas y Presupuestos)

#### 1. Creación y restauración de espacios
- **Backend:**
  - `spaces` (`01_initial_finance_schema.sql:17`): columna `currency text not null check (currency ~ '^[A-Z]{3}$') default 'EUR'`.
  - RPC `ensure_personal_space(p_name text default 'Personal', p_currency text default 'EUR')` (`01_initial_finance_schema.sql:191`).
  - RPC `create_couple_space(p_name text default 'Juntos', p_currency text default 'EUR')` (`22_couple_space_pending_until_accepted.sql:47`).
- **Cliente:**
  - Tipo `Space` (`src/features/spaces/types.ts:1-12`): contiene `{ id, name, type, isAwaitingPartner? }`. **No expone `currency`**.
  - `RemoteAccountSpace` (`src/features/sync/gateways/supabaseRemoteAccountGateway.ts:5-9`): contiene `{ remoteId, name, type }`. **No incluye `currency`**.
  - `fetchRemoteAccountSnapshot` (`supabaseRemoteAccountGateway.ts:41`): ejecuta `.select('id, name, type')` sobre `spaces`, omitiendo `currency`.
  - **Persistencia local de espacios:** `src/features/spaces/repositories/localSpaceRepository.ts` persiste exclusivamente en **AsyncStorage** bajo la clave `@juntoss/spaces/v1` (`StoredSpacesState { version: 1, activeSpaceId, spaces: Space[] }`). **No existe tabla SQLite `spaces`**. Añadir moneda a los espacios implica **versionar el payload de AsyncStorage**, no escribir migraciones SQL.

#### 2. Precedencia entre `profiles.default_currency` y `spaces.currency`
- **Backend:**
  - `profiles.default_currency` (`01_initial_finance_schema.sql:8`): default `'EUR'`. Define la moneda por defecto del usuario.
  - `spaces.currency` (`01_initial_finance_schema.sql:17`): default `'EUR'`. Define la moneda principal del espacio.
- **Cliente:**
  - `LocalProfile` (`src/features/profile/types.ts`): `{ avatarUri, displayName }`. No expone `defaultCurrency`.
  - `useCurrencyPreferences()` (`src/state/appPreferences/useCurrencyPreferences.ts`): Persiste en `AsyncStorage` (`@juntoss/currency-preferences/v1`) como `currencies: string[]`. La primera divisa opera como moneda activa local.
  - **Decisión de producto:** El espacio tiene moneda principal fijada al crearlo (`spaces.currency`), inicializada desde las preferencias locales (`useCurrencyPreferences`) del creador. Los agregados y presupuestos del espacio rigen bajo `spaces.currency`.

#### 3. Presupuestos locales
- **SQLite:** Ya contiene la tabla `category_budgets` (`src/lib/storage/localDatabase.ts:373-392`) con `currency TEXT NOT NULL`, restricción `UNIQUE (category_id, currency)` y backfill en `'EUR'`. No tiene repositorio consumidor aún en el cliente, pero la tabla existe en SQLite local.
- **Columna histórica en SQLite:** `categories.budget_minor INTEGER` (`localDatabase.ts:70`) almacena un único número sin divisa.
- **TypeScript:** `Category.budgetMinor?: number` (`src/features/categories/types.ts:32`).
- **Repositorio:** `localCategoryRepository.ts:updateCategoryBudget(id, budgetMinor)` guarda un entero sin divisa en `categories.budget_minor`.
- **UI:** `CategoryBudgetModal.tsx` captura y almacena un número plano (`budgetMinor`).

#### 4. Sincronización de presupuestos
- **Backend:**
  - Migración `08_category_budgets_per_currency.sql` creó la tabla `public.category_budgets(category_id, currency, budget_amount_minor, ...)` con funciones `set_category_budget` y `remove_category_budget`.
  - Sin embargo, `sync_couple_space_data` (`20_preserve_couple_space_local_ids.sql:63, 69, 78`) escribe directamente en `public.categories.budget_amount_minor` y **no interactúa con `public.category_budgets`**.
  - `fetchRemoteAccountSnapshot` (`supabaseRemoteAccountGateway.ts:58`) lee `categories.budget_amount_minor` y **no consulta `public.category_budgets`**.
- **Cliente:**
  - Toda la persistencia y sincronización actual de categorías en el cliente se apoya en `Category.budgetMinor`.

#### 5. Precisión sobre dimensionamiento y migraciones
- **Opción A (Presupuesto único atado a `spaces.currency`):** Exige versionar el payload de AsyncStorage de espacios y propagar los campos existentes en el cliente.
- **Opción B (Presupuestos multidivisa en `category_budgets`):** Exige además una **migración nueva** en PostgreSQL para actualizar los RPCs de sincronización en lote (`sync_couple_space_data`), ya que la migración 20 está aplicada y jamás se reescribe.
- **Resolución explícita de deuda:** Ambos caminos requieren resolver qué se hace con `categories.budget_amount_minor`, declarada histórica en la migración 08 pero retomada en las migraciones 18 y 20.

---

### 4. Cola de Fase 3 actualizada (orden de ejecución)

1. **Tarea 1 (Cerrada):** Dejar de silenciar los errores de restauración y subida en `MainTabsNavigator.tsx:325, 333`.
2. **Implementación parcial vigente (mantenida y probada):**
   - `HomeScreen.tsx:182`: Aislamiento por moneda en `categorySummaries` para no sumar importes entre divisas distintas.
   - `AddFirstTransactionStep.tsx:66, 158-164, 182-184`: Conexión de preferencias en onboarding blindada con `actionDisabled={!isReady}` y guard en `onAction` para prevenir la carrera de reinicio de draft.
3. **Tareas 2 y 3 (Clasificadas como Grande — Opción A en dos entregas):**
   - **Distinción de 3 monedas:**
     - `spaces.currency`: Moneda principal del espacio. Rige el presupuesto y es el valor por defecto para movimientos e importaciones.
     - `displayCurrency` (Moneda visible): Selección temporal en Inicio o Actividad para consulta.
     - `transaction.currency`: Moneda de cada movimiento individual.
     - *Regla derivada:* El progreso del presupuesto solo se calcula y compara contra movimientos en `spaces.currency`.
   - **Entrega 1 — El Modelo (Implementada, probada y aplicada en staging):**
     - Exponer `currency: CurrencyCode` en `Space`.
     - Versionar `StoredSpacesState` a `version: 2` en AsyncStorage (`@juntoss/spaces/v1`) con migración v1→v2 que use la preferencia real interna (`loadCurrencyPreferences()`) como semilla y EUR solo como fallback de último recurso. Sin parámetro en `loadSpaces()`. Persistencia inmediata del estado inicial en disco.
     - Enviar `currency: CurrencyCode` obligatorio en la creación local y remota (`create_couple_space`).
     - Soportar `currency` en `fetchRemoteAccountSnapshot` y `fetchRemoteCoupleSpace` validando con `isCurrencyCode` con error explícito estructurado (`RemoteSpaceIntegrityError`, sin casts ni fallbacks silenciosos ante filas remotas corruptas).
     - Migración nueva de PostgreSQL (`23_preserve_guest_space_currency.sql`) con lógica asimétrica (INSERT usa `'EUR'` si falta; UPDATE conserva `spaces.currency` existente ante clientes antiguos sin `currency`).
     - Suite pgTAP focal (`guest_space_currency.test.sql`) con 17 aserciones incluyendo idempotencia discriminante con payload modificado.
     - **Aplicación y Verificación en Staging (`blaanqqxtdezsscdkkvz`):**
       - Dry-run: `npx supabase db push --dry-run` confirmó solo `23_preserve_guest_space_currency.sql` pendiente (`EXIT=0`).
       - Aplicación: `npx supabase db push` aplicó `23_preserve_guest_space_currency.sql` (`EXIT=0`).
       - Comprobación de historial: `npx supabase migration list --linked` confirmó 01-08 y 10-23 aplicadas (`EXIT=0`).
       - Suite focal pgTAP en staging: `npx supabase test db --linked supabase/tests/guest_space_currency.test.sql` → 17/17 tests PASS (`EXIT=0`).
     - Sin tocar la interfaz.
   - **Entrega 2 — El Consumo (cerrada):**
     - Agregación con `summarizeCategories(categories, transactions, currency)` donde `currency` es obligatoria y el filtrado ocurre dentro.
     - Pantallas de Inicio y Actividad propagando su moneda visible al modal de detalle de categoría.
     - Presupuesto calculado y comparado exclusivamente contra movimientos en `spaces.currency`.
     - Creación e importación garantizando que `activeSpace.currency` sea la predeterminada.
     - Sustitución de los 8 literales `'EUR'` operativos.
     - Commits principales: `c039ae8`, `c915607`, `a30fe41`, `dcb5d8a` y
       `b55fbdf`.
     - Commits de cierre: `a0eb3fe` (fix de lotes reanudados con
       `currency = null`), `326fd07`/`277dc30` (conservación segura del
       borrador ante recargas) y `8249fbc` (trinquete exacto de longitud).
     - Evidencia diferencial asimétrica capturada (ejecución real, no «por
       construcción»): fuente fijada en `dcb5d8a` con los tests de HEAD → ROJO
       en `MainTabsNavigator › propagación multidivisa (Entrega 2) › Actividad
       arranca en la moneda del espacio (VES)…` (`Unable to find an element
       with text: No hay movimientos de este tipo`; 1 failed, 20 skipped de
       21); fuente restaurada a HEAD → VERDE (1 passed; suite
       `MainTabsNavigator` 21/21).
     - Reset de staging ejecutado (dirigido y transaccional): inventario
       confirmado (2 cuentas de prueba + espacio «Juntos» EUR + datos limpios)
       → borrado del espacio `b69578f8…` y sus datos en orden FK-seguro dentro
       de una única transacción → verificado a 0 filas. Se conservan
       `auth.users` y `profiles` (excluido Auth) para que el login siga
       funcionando; sin tocar migraciones, esquema, Edge Functions,
       configuración ni secrets.
     - Bloqueante reproducible hallado en el primer smoke físico y corregido:
       `CreateTransactionModal` reiniciaba el borrador
       con el modal abierto —la moneda elegida volvía a la del espacio y se
       perdía parte de lo escrito— en cada recarga de sincronización, Realtime
       o sondeo de 15 s. Causa: el catálogo de monedas reconstruido era el
       desencadenante del reinicio en creación y `initialDraft` reconstruido
       lo era durante la edición; `initialDate` era una dependencia innecesaria
       que se captura al abrir pero no cambia con el modal abierto. Arreglo:
       el reinicio se dispara solo en `[visible, activeSpaceId]` y el payload
       (`initialDraft`/`initialDate`/`spaceCurrency`) se actualiza mediante un
       efecto dedicado previo sobre un ref de snapshot; mismo contrato que el
       snapshot de `ImportScreen`, sin escritura de refs durante el render y sin
       supresión de `exhaustive-deps`. Prueba diferencial: 6 casos nuevos en
       `CreateTransactionModal.test.tsx` — 4 ROJO contra `70b0584` (moneda
       EUR→VES y título borrado, en creación y en edición) y VERDE tras el
       arreglo (suite 32/32). `npm run validate` completo en verde
       (122 suites / 727 tests).
     - Cierre manual: los smokes repetidos en iPhone y Honor confirmaron el
       borrador estable ante escritura, borrado y recargas; moneda principal y
       moneda visible separadas; presupuesto VES aislado de gastos EUR;
       sincronización sin duplicados; y worklets correctos en ambas plataformas
       (§6). Gate 2 aprobado por ambos verificadores.
   - **Fuera de alcance:**
     - `profiles.default_currency` queda fuera de ambas entregas.
     - `category_budgets` (SQLite local y PostgreSQL remota) sigue dormida: con una moneda principal por espacio, el presupuesto por divisa no aporta valor hasta que existan espacios multidivisa habituales.
     - Camino heredado `categories.budget_amount_minor` (contradicción migración 08 vs 18/20) registrado como pendiente.
     - `ensure_personal_space` no se invoca desde el cliente.
4. **Des-silenciar la publicación en segundo plano (cerrada — aprobada por los dos verificadores (commit dff044b)):**
   - `publishCoupleSpaceChanges` registra el fallo de `syncCoupleSpaceDataForCurrentSession` con `console.error('[sync] Publicación en segundo plano falló:', error)`, el mismo formato estructurado que la subida (`[sync] Subida de espacio compartido falló:`) y la restauración (`[sync] Restauración remota falló:`). Localizado por símbolo, no por línea. Sin propagar la excepción y sin alterar los datos locales.
   - Evidencia roja/verde: regresión nueva en `src/navigation/MainTabsNavigator.test.tsx` — ROJO contra el `catch(() => undefined)` original (`console.error` con 0 llamadas) y VERDE tras el fix (publicación fallida registrada y datos locales intactos).
   - `npm run validate` en verde: 122 suites / 728 tests, typecheck, lint, supresiones y formato.
5. **Permisos `PUBLIC EXECUTE`:** Migración **nueva**, jamás reescribir una aplicada (pequeña).
6. **Actualizar `space_invitations.test.sql`** al nombre de índice vigente `space_invitations_one_pending_per_target_idx` (pequeña).

*Pendiente aparte, por contacto:* Extracción de `ImportScreen.tsx` y `AppCalendar.tsx` (§4).

---

## 9. Auditoría de propuestas externas de Alphonzo — no integradas

### 9.1 Frontera y procedencia

El 2026-08-23 se inspeccionó mediante la API pública de GitHub, **sin ejecutar
`git fetch`, `pull`, `merge`, `cherry-pick` ni copiar archivos**, el trabajo que
Alphonzo añadió inicialmente a la rama `feat/ajustes-cuentas-actividad`, cuyo
extremo observado era `1b40900`, desde la base común local `c039ae8`. La
reauditoría del mismo día siguió el trabajo posterior en el PR externo #1,
rama `release/version-actual-app`, hasta `34449b6` (§9.6).

- Se observaron 18 commits de desarrollo y aproximadamente 170 archivos
  modificados bajo `src`, con más de 10.000 líneas añadidas. El tamaño no es
  evidencia de calidad ni de completitud.
- `upstream/main` permanece separado; la rama externa no se descargó ni se
  usará como base para una integración.
- El extremo observado no tiene checks de CI de GitHub asociados. Sus totales
  de pruebas y sus afirmaciones de funcionamiento no sustituyen Gate 1, pgTAP,
  staging ni los smokes exigidos por este repositorio.
- Los commits externos son **material de investigación**, no implementación del
  proyecto local. Sus pruebas declaradas no sustituyen Gate 1, pgTAP, staging ni
  los smokes exigidos por este repositorio.

Para una futura publicación se creará una rama de revisión nueva desde nuestro
HEAD; no se traerá ni se reescribirá la rama externa actual.

### 9.2 Qué propuso

| Grupo externo | Commits observados | Idea | Disposición local |
|---|---|---|---|
| Miembros, autoría y avatares | `93a2b7f` a `c949ec3` | Mostrar autor de cada movimiento, leer perfiles de miembros y sincronizar miniaturas mediante un bucket privado. | Alcance obligatorio de Fase 4a-4b; no integrado. Se rediseña con privacidad, Storage, RLS, pgTAP y smoke en dos dispositivos. |
| Monedas compartidas | `2d7a5b0`, `3aef261` | Unir moneda del espacio y preferencias de ambos miembros. | Adoptar la necesidad, no el código: extender nuestro catálogo canónico con las preferencias de miembros, conservando la precedencia del espacio y la protección contra reinicios del modal. |
| Reparación histórica de presupuestos | migración externa 27 dentro de `cd3abf1` | Reetiquetar como moneda del espacio ciertos presupuestos que la migración 08 asumió EUR. | Prerrequisito de Fase 4, no aplicado. Se resolverá la deuda con inventario real y migración propia solo si corresponde. |
| Cuentas de dinero | `aec1504`, `23cb5f4`, `a7e9488`, `14de52b` | Cuenta opcional por movimiento, tres tipos visuales y varios saldos monetarios por cuenta, con persistencia y sync local/remota. | Alcance obligatorio de Fase 4c; el producto está aceptado, pero su diseño e implementación externa no. |
| Ajustes visuales en curso | `cd3abf1` | Onboarding, botón flotante y fondo del navegador raíz. | Entran en la revisión de Fase 4d; se implementan de forma propia solo con criterio de aceptación. |
| Copias entre espacios | servicios de copia observados en la rama | Copiar categorías y movimientos entre espacios con confirmación. | Fase 4e; revisar moneda, presupuesto, cuenta asociada y aislamiento antes de implementarlo. |
| Superficie visual adicional | `cd3abf1`, `1b40900` | AvatarPair, secciones de cuentas, resumen sticky, encabezados/filtros, iconos, controles de modal y FAB. | Candidatos obligatorios del MVP final si cumplen accesibilidad y smoke; no se porta la implementación externa. |

### 9.3 Evaluación de «cuentas de dinero»

La cuenta de dinero forma parte del alcance del MVP final y aporta una segunda
dimensión —**dónde está el dinero**, además de **en qué se gastó**—, pero la
solución externa cambió de modelo tres veces en menos de un día: cinco tipos,
luego tres; una moneda por cuenta, luego varias. Su primer commit toca 74
archivos y casi 7.000 líneas. Por tamaño, persistencia, SQL, sincronización y
cálculo de saldos, nuestra implementación se clasifica como **tarea grande** y
se divide en entregas.

Antes de implementarla hay que resolver estas decisiones de producto:

1. **Significado del saldo inicial:** fecha desde la que aplica y tratamiento
   de movimientos anteriores. Un número sin fecha puede duplicar el saldo al
   importar histórico.
2. **Saldo actual frente a proyectado:** la propuesta externa incluye
   ocurrencias futuras del mes. Una cuenta bancaria puede necesitar saldo real,
   proyección o ambos, pero no debe llamarlos igual.
3. **Transferencias entre cuentas:** mover dinero propio no puede convertirse
   en ingreso y gasto que distorsione los agregados. La feature no se aprueba
   sin contrato explícito, aunque la interfaz de transferencias se difiera.
4. **Una o varias monedas por cuenta:** validar que el caso real compense la
   complejidad. Nunca se suman saldos de monedas distintas.
5. **Cambio de moneda al asignar una cuenta:** está prohibido relabelar el mismo
   `amountMinor` con otra divisa sin conversión ni confirmación. Si la cuenta no
   soporta la moneda del movimiento, la app debe bloquear, pedir una decisión o
   crear el saldo correspondiente.
6. **Propiedad compartida:** decidir quién puede editar, archivar o heredar una
   cuenta si su creador abandona el espacio o elimina su usuario.
7. **Orden con la escala monetaria:** la tarea de JPY/CLP/PYG (§8.4.9) afecta
   también los saldos iniciales; debe resolverse antes o formar parte del mismo
   diseño.

La implementación externa tampoco satisface todavía las condiciones técnicas
para servir de referencia directa:

- `money_account_balances` permite escritura directa a cualquier miembro del
  espacio, mientras la decisión declarada dice que solo el autor edita.
- La tabla hija valida por separado `money_account_id` y `space_id`, sin una
  foránea compuesta que impida asociar una cuenta de otro espacio.
- El RPC `security definer` de sincronización comprueba membresía, pero puede
  actualizar una cuenta existente sin comprobar su autoría.
- La moneda principal vive a la vez en `money_accounts.currency` y en la
  primera fila ordenada de balances, sin una restricción de base de datos que
  garantice que coincidan.
- Al escoger una cuenta incompatible, el formulario externo cambia la moneda
  del movimiento y conserva el importe numérico; eso altera su significado
  financiero sin conversión.
- `signedAmountInput` usa la API monetaria anterior y trata el resultado de
  `parseAmountMinor` como número; no es compatible con ADR-080 y no se copia.
- El detalle de cuenta filtra la métrica por la moneda seleccionada, pero su
  lista de movimientos solo filtra por cuenta: puede mostrar monedas mezcladas
  bajo un encabezado de una sola divisa.
- La tabla de balances permite escrituras directas a miembros activos aunque
  el comentario del RPC diga que la escritura debe ser controlada; además, la
  función de sincronización puede actualizar una cuenta existente sin validar
  autoría.
- La copia de movimiento conserva el identificador de cuenta del espacio
  origen y la copia de categoría arrastra el presupuesto sin revisar la moneda;
  ambas decisiones son peligrosas y quedan prohibidas en Fase 4e.
- La reparación histórica de presupuestos usa heurísticas sobre importe y
  fechas. Antes de escribir una migración propia se necesita inventario,
  simulación y criterio de reversión, no una copia de esa heurística.
- `money_accounts.test.sql` sigue afirmando que la cuenta es monomoneda y no
  cubre la tabla multidivisa añadida después. Las migraciones 28-34 no tienen
  ejecución pgTAP o staging aportada, y GitHub no registra CI para el extremo
  observado.
- La sincronización reemplaza todos los balances de una cuenta; deben definirse
  concurrencia, idempotencia y resolución entre dispositivos antes de usar ese
  enfoque.

Al comenzar la Fase 4c se diseñará desde nuestros contratos actuales y en este
orden:

1. Ficha de producto y ADR: saldo, fecha, transferencias, monedas y propiedad.
2. Modelo local versionado y migración con pruebas de datos previos.
3. Modelo remoto en migraciones nuevas posteriores a la última aplicada, con
   foráneas compuestas, RLS y pgTAP conductual.
4. Sincronización y migración de invitado idempotentes, probadas contra
   Supabase real.
5. Consumo en transacciones y UI, sin mezclar divisas ni inflar los componentes
   congelados.
6. Smokes financieros y de sincronización en iPhone y Honor.

### 9.4 Autoría y avatares

Exponer quién creó un movimiento compartido y mostrar los perfiles de los
miembros forman parte del MVP final. Subir fotografías sigue siendo una entrega
separada y más sensible. Antes de implementar deben definirse:

- Qué identidad se muestra mientras el perfil remoto o la imagen no están
  disponibles.
- Qué ocurre con la autoría y el avatar cuando alguien abandona un espacio o
  elimina la cuenta.
- Consentimiento, retención, borrado y caché local de imágenes.
- Bucket privado, límites de tamaño, rutas no predecibles, políticas de lectura
  y pruebas contra usuarios que no comparten espacio.
- Actualización y reintento sin convertir una pérdida de red en una foto
  equivocada o permanentemente obsoleta.
- La lectura de `profiles` debe seleccionar solo los campos necesarios; una
  política RLS de miembro no autoriza a exponer automáticamente locale,
  moneda por defecto u otros datos privados. El objeto del avatar debe vivir
  en Storage privado con rutas no predecibles y URLs temporales.

La ejecución se separa en dos tareas: primero **autoría textual**; después
**sincronización de avatares**. Ninguna se inicia durante el cierre actual de
monedas.

### 9.5 Resultado operativo de la auditoría

La auditoría no adopta migraciones externas ni cambia el estado de staging.
Las migraciones observadas (incluidas las numeradas 24–35 en esa rama) entran
en conflicto con la secuencia y los contratos locales; cualquier persistencia
futura usará el siguiente número libre de este repositorio y pruebas propias.
El resultado accionable queda distribuido en Fase 4a–4g: autoría, perfiles y
monedas de miembros, cuentas, superficie visual y copias entre espacios. La
ausencia de un problema también es un resultado válido: si una propuesta no
reproduce un requisito o no supera una prueba, se registra y no se implementa
para aparentar avance.

### 9.6 Reauditoría incremental del PR externo #1

El extremo observado de `release/version-actual-app` fue `34449b6`. El PR
mostraba 36 commits totales; frente al extremo ya auditado `1b40900`, el delta
era de 18 commits, 100 archivos y 5.987 líneas añadidas / 2.076 eliminadas. Por
alcance, **no es una tanda meramente estética**. GitHub indicaba que el commit
de cabecera no tenía checks asociados; los mensajes de commits que declaran
validaciones locales no constituyen evidencia local ni de CI.

| Grupo incremental | Commits observados | Qué aporta o cambia | Disposición local |
|---|---|---|---|
| Reparación de esquema local externo | `8c2f82a` | Autorrepara una instalación que llegó a la versión 20 sin tablas o columnas de cuentas, mediante una versión local 25. | No portar. Es evidencia de que el esquema externo de cuentas fue inestable; nuestra Fase 4c parte de migraciones propias y pruebas sobre datos previos. |
| Tipografía de saldos y métricas | `bbc9570`, `bdd97bf` | Agranda importes de detalle y centra el saldo de cuenta. | Candidato de 4d, después de existir cuentas; probar overflow, escalado de fuente y lectores de pantalla. |
| Analítica por cuenta | `3ad344e` | Extrae un donut genérico y reparte ingresos/gastos por cuenta, mes, modo y moneda. | Candidato de 4c/4d. No mezclar divisas ni ocultar movimientos sin cuenta; primero corregir la semántica divergente de Actividad. |
| Edición rápida de movimientos | `88db10e` | Edita categoría, cuenta, fecha y recurrencia desde el detalle y extrae lógica compartida. | Adoptar la necesidad, no el código. Entrega conductual propia con pruebas rojas de series, ocurrencias proyectadas, autoría, errores, notificaciones y sincronización. |
| Selector visual compartido | `0d99a3b`, `b9c8c46` | Generaliza el selector de apariencia y amplía/ordena catálogos de iconos de categorías y cuentas. | Candidato de 4d. Mantener estable la paleta existente; decidir si cuentas usan un catálogo enfocado o expresivo y auditar contraste. |
| Aislamiento de una copia del repositorio | `2cf2a8b` | Excluye una copia completa `JuntosRebirth-fase3/` de Git, TypeScript, ESLint, Prettier y Jest. | Rechazado: no aporta producto y puede ocultar artefactos. Este repositorio conserva sus guardas vigentes. |
| Texto e iconos siempre blancos | `3b2c2c4` | Fuerza blanco sobre todos los colores aunque el propio cambio reconoce fallos WCAG. | Rechazado. Se conserva contraste calculado; ninguna preferencia estética justifica texto ilegible. |
| Controles del modal | `0762325`, `cf340fa` | Mueve la moneda junto al título y corrige la rotación visual de flechas. | Candidatos de 4d, reimplementados sobre ADR-080, con ISO accesible y sin reiniciar el borrador al cambiar el catálogo. |
| Navegación global | `6274eed` | Restaura el encabezado en Inicio/Actividad y hace scroll al inicio al reseleccionar una pestaña. | Candidato de 4d con pruebas de navegación tipada y smoke físico en ambas plataformas. |
| Preferencias y animación de Actividad | `eb8e00f`, `6ff071d`, `3c6a89f` | Recuerda vista lista/cuadrícula y plegado; añade y luego secuencia la transición. | Candidato posterior a corregir modo/mes/periodo. Definir carga, error, toque rápido y movimiento reducido antes de animar. |
| Tres categorías en onboarding | `3166836` | Sube de una a tres las categorías obligatorias para terminar el onboarding. | No aceptado por defecto. Es fricción de producto, no estética; requiere ficha/experimento con finalización, tiempo y salida segura. |
| SVG exportados | `7e8d197` y activos de `34449b6` | Añade iconos de calendario, recurrencia, billetera y retroceso. | Referencia visual solamente. No copiar activos sin procedencia/licencia; preferir el sistema de iconos vigente. |
| Flujo de cuentas y modal | `34449b6` | Separa creación/edición de cuenta, rediseña el teclado y agrega automáticamente una moneda a la cuenta al asignar un movimiento incompatible. | Aceptar la separación de pasos como candidato; **no** mutar saldos o divisas en silencio. Aplicar el contrato local: bloquear, confirmar conversión o crear/seleccionar balance compatible de forma explícita. |
| Salida de espacios | `34449b6`, migración externa 35 | Sustituye disolución por salida individual y permite reactivar membresía; al salir el último miembro elimina el espacio y sus datos financieros. | Separar dos decisiones: salida individual/reingreso es candidata de Fase 4; el borrado duro del último miembro queda rechazado mientras no existan retención, exportación, reversibilidad y consentimiento explícitos. |
| Scripts de iOS | `34449b6` | Cambia el comando iOS a túnel y añade simulador. | No es requisito de producto. Evaluar solo si resuelve una necesidad reproducible del entorno local. |

Los números ADR que aparecen en esa rama no tienen autoridad ni se trasplantan:
el siguiente ADR se asigna según la secuencia de este repositorio.

### 9.7 Macrobloques de ejecución derivados

Para avanzar en bloques mayores sin mezclar riesgos incompatibles, las ideas
aceptadas o condicionadas se incorporan así:

1. **Identidad y convivencia compartida (4a-4b):** autoría textual, censo de
   miembros, avatar privado y contrato de salida/reingreso. El borrado terminal
   queda fuera hasta una decisión de retención y exportación.
2. **Núcleo de cuentas (4c, datos):** ficha y ADR, modelo local, SQL/RLS,
   sincronización e invitado. Cierra con cuentas correctas sin depender todavía
   del rediseño visual.
3. **Cuentas en el producto (4c-4d, consumo):** asignación explícita y segura,
   creación/edición por pasos, detalle, balances y analítica por cuenta, siempre
   aislados por moneda.
4. **Actividad y navegación (4d):** contrato único de modo/mes/periodo,
   encabezado global, scroll al inicio, preferencias lista/cuadrícula, plegado y
   animación accesible. La semántica se cierra antes que la persistencia visual.
5. **Movimiento y edición avanzada (4d):** primitivas visuales, modal compatible
   con ADR-080 y, como subentrega conductual, editores rápidos con recurrencia y
   sincronización probadas.
6. **Sistema visual y onboarding (4d):** selector de apariencia, catálogo de
   iconos, métricas y pulido responsive; el requisito de tres categorías solo
   entra si una ficha de producto lo aprueba.

Cada macrobloque puede abarcar varios commits, pero mantiene una única ficha,
un contrato verificable y Gate 1 verde. Persistencia, autenticación o ciclo de
vida siguen siendo tareas grandes con dos verificadores, aunque formen parte de
un bloque funcional mayor.
