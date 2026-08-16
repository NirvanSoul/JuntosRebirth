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
financiero, autenticación, importación, legal y espacios de pareja). Lo único
sin confirmar de punta a punta es la **sincronización Supabase** y la
**verificación de correo**.

## 3. Orden de trabajo

### Fase 1 — Limpieza quirúrgica (bajo riesgo, sin cambiar comportamiento)

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
`fe069e1` (F3), `e9cd5d5`/`5c19b3b` (F4), `3e83bd7` (check).

### Fase 2 — Spike: sincronización end-to-end + verificación de correo

Verificar (no arreglar) que la sync Supabase y la verificación de correo
funcionan de punta a punta. El resultado decide si Fase 3 existe y de qué tamaño.

### Fase 3 — Producto: terminar lo que el spike revele

Implementar lo que el spike demuestre que falta.

### Fase 4 — Descomposición por contacto

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
closure del catálogo, F4) y alberga la única supresión de `exhaustive-deps` que
permite el check de línea base. Es el siguiente candidato a extracción cuando
una tarea de producto lo toque.

### Fase 5 — Release

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

- [ ] **Las categorías y los movimientos compartidos no funcionan.** Es el
  síntoma principal del espacio de pareja y el motivo por el que la Fase 2
  existe. El spike debe reproducirlo con dos cuentas reales antes de que nadie
  proponga una corrección.

### Fase 3 — producto, pendientes de dimensionar

- [ ] **Un movimiento en otra moneda se sigue percibiendo como euros.** Antes
  de estimar: averiguar si el movimiento guarda su moneda y solo se muestra mal
  (bug de formateo, tarea pequeña) o si el importe se guarda sin moneda y se
  asume euro (hueco del modelo de datos: migración, totales mezclados,
  presupuestos por categoría — tarea grande). Existe la migración
  `08_category_budgets_per_currency`, así que el soporte puede estar a medias.
  Esa pregunta se responde primero y decide el tamaño.

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

