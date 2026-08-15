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

### Fase 1b — Auditoría de supresiones de `exhaustive-deps`

Las 5 supresiones pueden esconder *closures* obsoletos (bugs reales). Es **caza
de bugs**, no limpieza: se auditan, se corrigen los defectos y se activa un check
con línea base para impedir nuevas supresiones.

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
