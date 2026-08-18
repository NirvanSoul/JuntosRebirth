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

El trabajo activo está en la **Fase 3**, cerrando el consumo coherente de la
moneda principal del espacio en Inicio, Actividad, presupuestos, creación e
importación. La implementación está en revisión; faltan el borde de lotes de
importación reanudados sin moneda y los smokes físicos finales. La Fase 5 de
release no ha comenzado.

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

### Fase 3 — Producto: terminar lo que el spike reveló — en curso

Implementar lo que el spike demuestre que falta.

### Fase 4 — Desarrollo funcional del MVP final — pendiente

Esta fase incorpora como **alcance obligatorio de producto** las capacidades
que Alphonzo propuso en la rama externa: autoría visible, perfiles y avatares de
miembros, cuentas de dinero y los ajustes visuales que superen revisión. Se
implementarán desde nuestros contratos y reglas; que una capacidad entre en el
MVP **no aprueba ni integra su código externo** (§9).

No comienza hasta cerrar la Entrega 2 de monedas. Sus prerrequisitos son:

- Resolver la escala de monedas sin centavos (§8.4.9) antes de almacenar nuevos
  saldos iniciales.
- Resolver explícitamente la contradicción de `category_budgets` y decidir, con
  inventario real, si hace falta reparar el backfill histórico que asumió EUR.
- Crear migraciones propias desde el siguiente número libre en nuestro
  repositorio; los números 24-34 de la rama externa no están reservados ni se
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

#### Fase 4d — Consolidación visual

- Revisar las propuestas externas sobre progreso de onboarding, botón flotante,
  fondo raíz y presentación de cuentas contra `PRODUCT.md` y el sistema de
  diseño.
- Implementar solo las que tengan objetivo y criterio de aceptación; no portar
  el commit externo de «trabajo en curso».
- Hacer smoke visual y nativo en iOS y Android.

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
- Build EAS, cuentas de tienda, política de privacidad accesible.
- Revisar la licencia y las vulnerabilidades de `xlsx`: es de **runtime**
  (importación) y `npm audit` le marca prototype pollution + ReDoS **sin fix**.
- Revisar `npm audit` (29: 13 moderadas, 16 altas); el resto son tooling de
  build de Expo (`image-size`, `postcss`, `uuid`, `js-yaml`) y en su mayoría se
  resuelven subiendo de SDK de Expo (cambio mayor, diferido).

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

- [ ] **Cerrar el consumo multidivisa sin presentar importes como euros por
  defecto.** El modelo y la mayor parte de la interfaz ya están implementados:
  `spaces.currency` es la fuente del espacio, los agregados filtran por moneda
  y el catálogo visible es común a Inicio y Actividad. La casilla permanece
  abierta hasta corregir los lotes reanudados con `currency = null`, aportar la
  evidencia diferencial pendiente y completar los smokes físicos de la
  Entrega 2 (§8.4).

- [ ] **Registrarse con un correo ya usado no avisa de nada** y el usuario
  espera un código que nunca llega. El silencio puede ser deliberado: responder
  igual ante correo nuevo y ya registrado evita que cualquiera averigüe qué
  correos tienen cuenta. La corrección no es «decir que ya existe», sino cerrar
  la espera sin revelar nada — mensaje neutro y un correo real a esa dirección.
  Requiere decisión del responsable antes de implementar.

### Sin fase asignada — tarea pequeña

- [ ] **Poder ver la contraseña mientras se escribe.** Aplica a registro,
  inicio de sesión y recuperación; usar la primitiva de campo existente, no un
  control nuevo por pantalla.

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
   - **Entrega 2 — El Consumo (implementada; cierre pendiente):**
     - Agregación con `summarizeCategories(categories, transactions, currency)` donde `currency` es obligatoria y el filtrado ocurre dentro.
     - Pantallas de Inicio y Actividad propagando su moneda visible al modal de detalle de categoría.
     - Presupuesto calculado y comparado exclusivamente contra movimientos en `spaces.currency`.
     - Creación e importación garantizando que `activeSpace.currency` sea la predeterminada.
     - Sustitución de los 8 literales `'EUR'` operativos.
     - Commits principales: `c039ae8`, `c915607`, `a30fe41`, `dcb5d8a` y
       `b55fbdf`.
     - Pendiente de cierre: normalizar y persistir la moneda de lotes antiguos
       reanudados con `currency = null`; ejecutar la prueba asimétrica contra el
       estado anterior; y completar los smokes de worklets y moneda del espacio
       en iPhone y Honor sobre datos de prueba limpios.
   - **Fuera de alcance:**
     - `profiles.default_currency` queda fuera de ambas entregas.
     - `category_budgets` (SQLite local y PostgreSQL remota) sigue dormida: con una moneda principal por espacio, el presupuesto por divisa no aporta valor hasta que existan espacios multidivisa habituales.
     - Camino heredado `categories.budget_amount_minor` (contradicción migración 08 vs 18/20) registrado como pendiente.
     - `ensure_personal_space` no se invoca desde el cliente.
4. **Des-silenciar subida en segundo plano (`MainTabsNavigator.tsx:352`):** Registrar fallo estructurado en `publishCoupleSpaceChanges({ spaceId }).catch(...)` (pequeña).
5. **Indicador de novedades en el selector de espacio (mediana):** Un punto cuando hay algo nuevo en un espacio que no estás mirando, calculado con una consulta ligera al abrir la app y al volver a primer plano. Sin suscripciones ni notificaciones flotantes (`JUNTOSS_NOTIFICATIONS.md` §19).
6. **Permisos `PUBLIC EXECUTE`:** Migración **nueva**, jamás reescribir una aplicada (pequeña).
7. **Actualizar `space_invitations.test.sql`** al nombre de índice vigente `space_invitations_one_pending_per_target_idx` (pequeña).
8. **Higiene de tests:** Resolver avisos de `act(...)` en la suite de onboarding `AddFirstTransactionStep.test.tsx` (pequeña).
9. **Escala y decimales monetarios (tarea grande):**
   - `CurrencyCatalogEntry` no declara el número de decimales monetarios, y la entrada, `amountMinorToInput`, `parseAmountMinor` y `formatCurrency` asumen siempre escala 100.
   - En el catálogo actual, **JPY, CLP y PYG tienen cero decimales**; COP conserva oficialmente dos (los centavos en efectivo son una decisión de presentación, no de almacenamiento).
   - El formato ya omite `,00` en importes enteros (`omitZeroDecimals` por defecto), por lo que no es un problema visual sino **semántico**: se permiten fracciones que no existen y lo guardado en `amountMinor` no representa unidades menores oficiales.
   - Antes de implementar debe decidirse entre:
     - Mantener escala interna 100 para todas y separar los decimales de entrada y presentación.
     - Usar la escala real de cada moneda y **migrar los importes locales y remotos existentes**.
   - Regla obligatoria: Comprobar previamente si existen datos en esas monedas consultando staging y los dispositivos antes de darla por trivial.
10. **Internacionalización (tarea grande, anterior al lanzamiento):**
    - Meta inicial español e inglés, con arquitectura extensible.
    - Incluye interfaz, onboarding, categorías predeterminadas, errores, notificaciones, plantillas de correo y textos del backend.
    - Se completa **antes** de publicar en tiendas para evitar retrabajo transversal y lanzar una experiencia lingüísticamente coherente. Es la tarea más grande restante en el plan.
11. **El `locale` fijo `'es-ES'`:**
    - Forma parte de la internacionalización y no se corrige por separado: la selección del locale debe derivar de la arquitectura de idiomas, no al revés.

*Pendiente aparte, por contacto:* Extracción de `ImportScreen.tsx` y `AppCalendar.tsx` (§4).

---

## 9. Auditoría de propuestas externas de Alphonzo — no integradas

### 9.1 Frontera y procedencia

El 2026-08-18 se inspeccionó mediante la API pública de GitHub, **sin ejecutar
`git fetch`, `pull`, `merge`, `cherry-pick` ni copiar archivos**, el trabajo que
Alphonzo añadió después de `ffc87f9` a la rama publicada
`limpieza/fases-1-y-1b` del repositorio original.

- `upstream/main` permanece en `b4c212a`; no recibió estos cambios.
- La rama publicada dejó de ser una instantánea limpia de nuestro trabajo y no
  debe usarse como fuente para continuar ni como base para una integración.
- El extremo externo observado es `14de52b`. No tiene estados de CI ni checks
  de GitHub asociados.
- Los commits externos son **material de investigación**, no implementación del
  proyecto local. Sus pruebas declaradas no sustituyen Gate 1, pgTAP, staging ni
  los smokes exigidos por este repositorio.

Para una futura publicación se creará una rama de revisión nueva desde nuestro
HEAD; no se traerá ni se reescribirá la rama externa actual.

### 9.2 Qué propuso

| Grupo externo | Commits observados | Idea | Disposición local |
|---|---|---|---|
| Miembros, autoría y avatares | `93a2b7f` a `c949ec3` | Mostrar autor de cada movimiento, leer perfiles de miembros y sincronizar miniaturas mediante un bucket privado. | Alcance obligatorio de Fase 4a-4b; no integrado. Se rediseña con privacidad, Storage, RLS, pgTAP y smoke en dos dispositivos. |
| Monedas compartidas | `2d7a5b0`, `3aef261` | Unir moneda del espacio y preferencias de ambos miembros. | No portar: el defecto ya está resuelto localmente mediante el catálogo canónico del espacio (`dcb5d8a`, `b55fbdf`) sin depender de `profiles.default_currency`. |
| Reparación histórica de presupuestos | migración externa 27 dentro de `cd3abf1` | Reetiquetar como moneda del espacio ciertos presupuestos que la migración 08 asumió EUR. | Prerrequisito de Fase 4, no aplicado. Se resolverá la deuda con inventario real y migración propia solo si corresponde. |
| Cuentas de dinero | `aec1504`, `23cb5f4`, `a7e9488`, `14de52b` | Cuenta opcional por movimiento, tres tipos visuales y varios saldos monetarios por cuenta, con persistencia y sync local/remota. | Alcance obligatorio de Fase 4c; el producto está aceptado, pero su diseño e implementación externa no. |
| Ajustes visuales en curso | `cd3abf1` | Onboarding, botón flotante y fondo del navegador raíz. | Entran en la revisión de Fase 4d; se implementan de forma propia solo con criterio de aceptación. |

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

La ejecución se separa en dos tareas: primero **autoría textual**; después
**sincronización de avatares**. Ninguna se inicia durante el cierre actual de
monedas.
