# Encargo para el agente de la app: aislamiento de cuentas y datos pendientes

## Contexto y límites

- Trabaja en `Juntos Rebirth`. Antes de modificar código lee `Bible/README.md`, `Bible/PROJECT_RULES.md`, `Bible/WORKFLOW.md` y la documentación de dominio aplicable. Esta tarea toca sesión, persistencia y sincronización: clasifícala y sigue los gates correspondientes.
- El 1 de noviembre de 2026 había cambios sin confirmar y otros procesos modificando el repositorio. Inspecciona el estado actual y conserva el trabajo existente; no lo descartes ni supongas que las líneas no han cambiado.
- La auditoría identificó los escenarios siguientes mediante lectura de código. Reprodúcelos con datos ficticios y pruebas que fallen antes de la corrección. No se verificaron dispositivos físicos ni PostgreSQL remoto.
- Coordina los contratos y pruebas con el agente de la API: `patch/BACKEND.md`. Evita cambiar una parte aislada si la otra necesita reconocer el mismo resultado de sincronización.

## 1. Bloqueante: aislamiento de caché entre cuentas

En `src/lib/storage/localDatabase.ts`, `discardLocalDatabase` captura el fallo de `SQLite.deleteDatabaseAsync` y continúa. `prepareLocalCacheForSession` puede entonces asociar la base sobreviviente a otra cuenta. Además, `localSyncAccountRepository.ts` adopta una caché sin propietario ni enlaces que identifiquen otra cuenta; no se puede demostrar a quién pertenece.

**Resultado exigido:** antes de mostrar o subir cualquier dato financiero, debe existir evidencia suficiente de que pertenece a la sesión actual. Un error de cierre o borrado que impida garantizar el aislamiento debe propagarse y bloquear la asociación, visualización y subida de esa caché; debe ofrecerse un estado recuperable comprensible. No borres datos de propietario desconocido solo por no poder atribuirlos: manténlos aislados hasta una recuperación segura. No firmes ni envíes datos de una cuenta con la sesión de otra.

Pruebas: cuenta A con datos locales → fallo simulado al borrar → inicio B; B no ve ni sube datos A y no se cambia el propietario. Incluye fallo de apertura/cierre, reintento satisfactorio, caché heredada sin propietario, ausencia de sesión y restauración de la misma cuenta con datos pendientes. Verifica que la UI no muestre datos de A ni brevemente durante la transición.

## 2. Bloqueante: restauración de saldos pendientes

`src/features/sync/services/applyRemoteCollections.ts` evita reemplazar el padre `money_accounts` si no está `synced`, pero borra y vuelve a insertar `money_account_balances` sin esa condición. `sessionInitialization.ts` restaura el snapshot antes de subir pendientes.

Reproduce una cuenta existente con edición local de saldo pendiente, seguida de snapshot remoto anterior: el saldo local debe sobrevivir y poder subirse. Aplica la misma protección en restauración completa y delta; protege todas las monedas y las modificaciones durante una sincronización en curso. Revisa la protección equivalente de presupuestos y otras colecciones hijas. Incluye rollback ante error y un caso sin cambios locales donde sí se acepte el dato remoto.

## 3. Importante: cierre de sesión con cambios pendientes

`SettingsScreen.tsx` cierra sesión y elimina SQLite sin comprobar previamente los datos no sincronizados. La confirmación actual no indica que esos datos podrían perderse.

Detecta los cambios pendientes de todos los tipos relevantes, no solo movimientos. Antes de descartarlos, ofrece una vía clara para reintentar sincronización y una decisión informada si no se pueden subir. Mantén el aislamiento entre cuentas y respeta las reglas del producto sobre cierre de sesión; no prometas recuperación cuando no exista. Prueba éxito, fallo de red, rechazo de servidor, cancelación y cambio posterior a otra cuenta, sin duplicar movimientos al reintentar.

## 4. Resultado real de conflictos y compatibilidad con API

`syncCoupleSpaceData.ts` marca como sincronizadas las filas enviadas después de una respuesta exitosa. La API revisada puede descartar el padre por una versión más reciente y, aun así, responder con los datos enviados. Coordina una solución con el agente backend para que la app distinga lo aceptado de lo rechazado y recupere el estado canónico sin borrar cambios posteriores al envío. Mantén compatibilidad explícita con la versión de API realmente desplegada y documenta cualquier cambio de contrato.

La app envía periodicidad e historial de presupuestos que no estaban en el `origin/main` de la API revisado. No des por desplegada la implementación local pendiente: valida escritura, snapshot y delta de ambos lados, con varias monedas, excepciones e historial.

## Entrega y verificaciones

- Ejecuta `npm run validate` con el árbol estable y sin otras suites simultáneas. La ejecución de la auditoría pasó typecheck, lint y formato; Jest registró un timeout en `ActivityScreen.author.test.tsx` bajo carga concurrente y se interrumpió: no se conoce el resultado final.
- Añade pruebas significativas que reproduzcan cada defecto antes del arreglo y pasen después; cubre dos cuentas, dos dispositivos, desconexión, reintento, transición de sesión y restauración. Usa exclusivamente datos ficticios.
- Prueba los flujos críticos en iOS y Android cuando exista entorno nativo, e indica con precisión lo que no se verificó. La integración de PostgreSQL requiere una base remota aislada y confirmada; no uses la configuración por defecto sin identificarla.
- Actualiza `Bible/API.md`, arquitectura u otra fuente de verdad si cambia un contrato o flujo. Entrega evidencia, archivos, riesgos, límites y el paquete de revisión exigido por `Bible/WORKFLOW.md`.

---

## Nota del agente API (2026-11-02): contrato de conflictos de sync

Implementado en `Juntos API` sin confirmar ni desplegar. Detalle en su README y en `SYNC_CONFLICTS_AND_BUDGETS_2026-11-02.md`.

- `POST /v1/spaces/:spaceId/sync` sigue respondiendo 200 con la misma forma; solo añade campos:
  - `transactions[].applied: boolean`. Con `false`, `updatedAt`, `accountingAmountMinorUsd` y `exchangeSnapshot` son los canónicos del servidor (no los enviados). El `updatedAt` no coincidirá con el local, así que el `UPDATE ... WHERE id = ? AND updated_at = ?` actual ya no mezcla valores.
  - `conflicts?: { collection, localId, remoteId, reason: "NEWER_VERSION" | "NOT_IN_SPACE", serverUpdatedAt }[]`, para las cuatro colecciones. Solo aparece si hay alguno.
- Lo que la app debería hacer: no marcar como `synced` las filas listadas en `conflicts`. Si la fila local no cambió desde el envío, debe aceptar la versión canónica (llega por `/v1/sync/changes`: el servidor vuelve a publicar la canónica al descartar una vieja). Si cambió después, debe dejarla pendiente.
- Aunque una app antigua ignore `conflicts`, converge: recibe la canónica por delta.
- Nuevo error reintentable: `409 SYNC_CONCURRENT_UPDATE`. Lo ya confirmado es idempotente; basta con reintentar el lote.
- Presupuestos: la API nueva guarda y devuelve `period`, `intervalDays`, `anchorOn`, `overrides` e `history`. Una entrada sin ninguno de esos campos solo cambia el importe. **La API desplegada en `origin/main` (`b67e68e`) los ignora y devuelve presupuestos sin ellos.** No publiquéis presupuestos por periodo antes del despliegue de la API, o tratad la ausencia de esos campos en snapshot/delta como «desconocido», no como «mensual».

## Nota del agente API (2026-11-03): estado del despliegue

- Desplegado en producción: Worker `7fb66610` (2026-11-03 14:37 UTC), código
  `439b3e9` de `main` de la API. `GET /health/db` responde `ok`, lo que exige
  `category_budgets.history`: las migraciones 0033 y 0034 están aplicadas.
  Ya se pueden publicar los presupuestos por periodo y probar los conflictos
  contra la API real.
- `409 SYNC_CONCURRENT_UPDATE` en `POST /v1/spaces/:id/sync`: no se confirmó
  nada y el lote es idempotente. Hoy la app lo clasifica como `recoverable` y
  muestra "No se puede completar la operación por un conflicto." pidiendo un
  reintento manual. Sugerencia: reintentarlo en silencio una o dos veces con
  una espera corta antes de mostrar nada.
- Rollback del Worker si hiciera falta: `npx wrangler rollback
b332f343-b5b9-4456-a9a5-44c78fe1a0ef` (las columnas nuevas son compatibles
  con él; no hace falta tocar la base).
