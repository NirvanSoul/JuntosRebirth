# Current step

STEP 11 — PDF eliminado por completo (ADR-073). El importador vuelve a
soportar únicamente Excel (`.xls`/`.xlsx`) y CSV, exactamente como en la
Fase 1. Pendiente: commit remoto idempotente por `import_batch` (fase 12
interna, ver "Known issues").

# Completed

- Detección robusta de la fila de encabezados real en Excel/CSV: busca entre
  las primeras filas cuál reconoce como encabezado (fecha + señal de
  importe) en vez de asumir que es la primera fila no vacía. Esto evita que
  el nombre del banco, el titular o el periodo del extracto —filas no
  vacías pero sin ser la tabla— se traten como encabezado o como un
  movimiento más.
- Selección de archivos XLS/XLSX/CSV, parser tabular (SheetJS) y mapeo de
  columnas.
- Normalización de fechas, importes, moneda, descripción y tipo.
- Detección local de duplicados contra el espacio activo.
- Revisión previa a importar y asignación de categorías existentes o nuevas.
- Revisión masiva por comercio normalizado: una selección/categoría aplica a
  todas las filas del mismo comercio, conservando fecha, importe y tipo de
  cada movimiento.
- Selección y deselección de todos los movimientos listos.
- Guardado atómico local mediante `createLocalTransactions` y actualización
  inmediata del estado de navegación.
- Reglas personales locales por espacio: una categoría confirmada para un
  comercio se guarda y se prioriza en la siguiente importación.
- Esquema Supabase real para reglas personales, batches e ítems de
  importación, con RLS por propietario y pertenencia al espacio.
- Sincronización idempotente de reglas personales tras la migración
  autenticada: el RPC resuelve IDs locales mediante los mapas de espacio y
  categoría, sin aceptar IDs remotos arbitrarios del dispositivo.
- Batches e ítems normalizados persistidos localmente, sin conservar el
  archivo y con actualizaciones atómicas de selección, categoría y resultado.
- Sincronización idempotente de batches e ítems tras reglas personales: el
  RPC conserva selección, estado y datos normalizados, y resuelve IDs locales
  de espacio, categoría y duplicado antes de escribir en Supabase.
- Reanudación local segura: al abrir Importar movimientos se recupera primero
  el batch pendiente más reciente del espacio activo, sin abrir el archivo ni
  mezclar revisiones de otro espacio.
- Centro de importaciones local: lista los batches pendientes del espacio
  activo, permite retomar uno concreto, descartarlo sin borrar su trazabilidad
  o elegir un archivo nuevo.
- Restauración autenticada inicial: `remote_entity_links` guarda el mapeo
  remoto→local de espacios y categorías; una sesión sin datos de invitado
  materializa el catálogo remoto antes de descargar sus batches de importación.
- La restauración inversa también materializa recurrencias y movimientos tras
  resolver sus enlaces de espacio, categoría y serie, sin sobrescribir filas
  locales que aún estén pendientes de sincronización.
- Esquema comunitario privado en Supabase: un voto actual por usuario,
  merchant y país; agregados actualizados solo por RPC y candidatos pendientes
  de revisión manual a partir de 20 usuarios y 85 % de consenso.
- `source_type` corregido: SQLite y Supabase solo aceptaban `('xls','xlsx','csv')`;
  se eliminó la capacidad muerta `'tsv'` que el cliente nunca producía.
- `file_hash` conectado de extremo a extremo: se calcula al elegir el
  archivo (`expo-crypto` sobre su base64), se guarda localmente, se
  sincroniza al RPC, y si coincide con una importación previa del mismo
  espacio se avisa al usuario antes de analizar el archivo, con opción de
  continuar de todas formas.
- Cola local de feedback comunitario conectada: al confirmar una importación,
  cada candidato cuya categoría final tiene `templateKey` (clave canónica)
  encola un voto; se sincroniza después de los batches, solo para ítems ya
  confirmados remotamente, y nunca para categorías propias del usuario sin
  `templateKey`.
- **PDF eliminado por completo (ADR-073).** Se probó primero un backend/worker
  (ADR-070) y después extracción 100 % on-device con `expo-pdf-text-extract`
  (ADR-071), pero la implementación on-device generó errores recurrentes, el
  spike de validación contra 20 layouts reales (spec §81) nunca se completó,
  y el producto valoró PDF como una función de uso marginal frente a su
  coste de mantenimiento. Se eliminó en vez de seguir depurándola:
  - Cliente: `src/features/import/parsers/pdfParser.ts` y
    `extractPdfRows.ts` (+ sus tests) borrados. `ImportScreen.tsx` perdió la
    fase `pdf-password` y toda su rama de parseo de PDF.
    `ImportSourceExtension` y las constantes de límites/mime-types en
    `importLimits.ts` ya no incluyen `'pdf'`. `validateImportFile` rechaza
    `.pdf` con `unsupported_file`.
  - Dependencia `expo-pdf-text-extract` desinstalada de `package.json`.
  - SQLite local: migración 16 (que solo existía para que `source_type`
    aceptara `'pdf'`) eliminada; `localDatabaseVersion` volvió a 15.
  - Supabase: `supabase/migrations/14_import_batches_pdf_source_type.sql`
    eliminada. La migración 12 ya dejaba `source_type` y
    `sync_import_batches` sin `'pdf'`, así que no hizo falta ninguna
    migración de reversión.
  - No había ninguna Edge Function de PDF que eliminar: la de ADR-070
    (`supabase/functions/import-pdf-extract/`) ya se había borrado por
    completo al adoptar ADR-071.
  - Excel/CSV no cambiaron: mismo parser (`SheetJS`), mismo pipeline.

# Decisions

- Los grupos usan `normalizedMerchant`, no el texto original del extracto.
- Una categoría puede contener gastos e ingresos; el `type` se conserva por
  fila y no se deriva de la categoría.
- Los duplicados exactos siguen deseleccionados por defecto y no entran en
  «Seleccionar todo».
- La última corrección explícita del usuario sustituye la categoría de su
  regla personal; no pueden existir dos reglas activas para el mismo comercio
  y espacio.
- El aprendizaje de comercios, batches persistentes y reglas de Supabase
  queda encapsulado en gateways; el usuario invitado no escribe
  filas remotas.
- El aprendizaje comunitario nunca promociona una regla directamente al
  catálogo: solo crea un candidato para revisión manual.
- El feedback comunitario solo se encola para categorías con `templateKey`
  (clave canónica de las categorías por defecto); una categoría creada por
  el usuario nunca alimenta el consenso comunitario.
- **PDF eliminado por completo (ADR-073), reemplaza ADR-071.** El importador
  vuelve a funcionar enteramente en Expo Go: ya no depende de ningún módulo
  nativo. Reintroducir PDF en el futuro es una reimplementación desde cero,
  no una reactivación de código existente.

# Files changed

- `Bible/JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md` (nota al inicio + MVP sin PDF)
- `Bible/DECISIONS.md` (ADR-073)
- `Bible/DATABASE.md` (versión 16 y migración 14 documentadas como eliminadas)
- `Bible/PRODUCT.md` (formatos soportados)
- `Bible/ROADMAP.md` (Fase 20: tareas de PDF reemplazadas por la nota de eliminación)
- `src/features/import/types.ts` (`ImportSourceExtension` sin `'pdf'`)
- `src/features/import/constants/importLimits.ts` (sin `'pdf'` ni `importMaxPdfPages`)
- `src/features/import/validation/validateImportFile.ts` (+ test)
- `src/features/import/screens/ImportScreen.tsx` (+ test: sin fase `pdf-password` ni parser de PDF)
- `src/features/import/repositories/localImportBatchRepository.ts`
- `src/components/overlays/QuickCreateMenu/QuickCreateMenu.tsx` (copy sin PDF)
- `src/lib/storage/localDatabase.ts` (migración 16 eliminada, versión 15)
- `supabase/migrations/14_import_batches_pdf_source_type.sql` (eliminada)
- `src/features/import/parsers/pdfParser.ts` (eliminado)
- `src/features/import/parsers/pdfParser.test.ts` (eliminado)
- `src/features/import/parsers/extractPdfRows.ts` (eliminado)
- `src/features/import/parsers/extractPdfRows.test.ts` (eliminado)
- `package.json` / `package-lock.json` (quita `expo-pdf-text-extract`)

# Dependencies

- Ninguna dependencia nueva. `expo-pdf-text-extract` se desinstaló.

# Database changes

- SQLite: la migración 16 (`source_type` con `'pdf'`) se eliminó del
  archivo de migraciones; `localDatabaseVersion` bajó de 16 a 15. Un
  dispositivo de desarrollo que ya hubiera llegado a la versión 16 debe
  resetear su base local (reinstalar la app / borrar datos), ya que el
  proyecto es pre-release y no hay usuarios reales con esa versión.
- Supabase: `14_import_batches_pdf_source_type.sql` se eliminó. Ninguna
  migración de Supabase se había desplegado a un proyecto real (todas
  siguen sin comitear en git al momento de este cambio), así que no aplica
  ningún proceso de rollback en producción.

# Known issues

- El commit remoto idempotente por `import_batch` corresponde a la fase 12
  interna (pendiente, sin relación con la eliminación de PDF).

# Next exact task

Retomar el commit remoto idempotente por `import_batch` (fase 12 interna).
No hay ninguna tarea pendiente relacionada con PDF: quedó fuera de alcance
por ADR-073.
