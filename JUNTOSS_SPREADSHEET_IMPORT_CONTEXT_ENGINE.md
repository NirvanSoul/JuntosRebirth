# JUNTOSS_SPREADSHEET_IMPORT_CONTEXT_ENGINE.md

> **Estado:** guía de implementación paso a paso para agentes de IA  
> **Fecha de investigación:** 9 de agosto de 2026  
> **Stack objetivo:** React Native · TypeScript · Supabase · iOS · Android  
> **Alcance:** XLS, XLSX, CSV, TSV y otros formatos tabulares equivalentes  
> **FUERA DE ALCANCE:** PDF, OCR, imágenes y LLM/IA generativa

---

# 0. Objetivo

Construir en `juntoss` un sistema de importación de movimientos bancarios desde archivos tabulares, completamente funcional sin IA generativa.

Debe permitir:

1. Seleccionar un archivo del banco.
2. Leerlo localmente.
3. Detectar su estructura y columnas.
4. Normalizar fechas, importes, monedas y descripciones.
5. Detectar gasto/ingreso.
6. Evitar duplicados.
7. Sugerir categorías mediante reglas locales.
8. Aprender de las correcciones del usuario.
9. Sincronizar ese aprendizaje con Supabase para conservarlo entre dispositivos.
10. Recoger feedback comunitario de forma controlada y agregada.
11. Mantener un **Centro de importaciones** donde el usuario pueda retomar revisiones pendientes.
12. Hacer que los movimientos confirmados aparezcan inmediatamente en Inicio, Actividad y Mapa.

Experiencia esperada:

```text
Elegir archivo
    ↓
juntoss lo analiza localmente
    ↓
"Encontramos 126 movimientos"
    ↓
105 listos
14 necesitan categoría
7 parecen repetidos
    ↓
el usuario revisa excepciones
    ↓
Importar
    ↓
la app recuerda las correcciones
```

---

# 1. Principio arquitectónico

> **Automatizar lo seguro. Sugerir lo probable. Preguntar lo ambiguo. Nunca inventar.**

La importación no debe convertirse en un segundo sistema financiero.

Los movimientos importados deben terminar utilizando el **mismo modelo, servicio, repositorio y validaciones** que los movimientos creados manualmente.

No crear:

- otra tabla de movimientos permanente;
- otra lista de categorías;
- otro balance;
- otra lógica de espacios;
- otra caché de actividad;
- otro sistema de fechas.

---

# 2. Protocolo obligatorio del agente

Antes de modificar código, el agente DEBE leer:

```text
README.md
PROJECT_RULES.md
ARCHITECTURE.md
DATABASE.md
```

y localizar:

```text
modelo Transaction
modelo Category
activeSpace
servicio/repository de creación de movimiento
servicio/repository de categorías
sistema de persistencia local
cliente Supabase
pantalla Ajustes
componentes visuales de Ajustes
componentes visuales de movimiento
modal/bottom sheet actual
```

Después debe crear una nota:

```md
## Spreadsheet import audit

### Existing transaction path

...

### Existing category source of truth

...

### Existing space model

...

### Existing local persistence

...

### Existing Supabase tables

...

### Existing reusable UI components

...

### Existing dependencies

...

### New dependencies proposed

...

### Files that will change

...

### Risks

...
```

**No comenzar la implementación hasta terminar esta auditoría.**

---

# 3. Investigación: dependencias recomendadas

## 3.1 Selector de archivos

### `@react-native-documents/picker`

Documentación:

https://react-native-documents.github.io/

Repositorio:

https://github.com/react-native-documents/document-picker

La librería moderna utiliza los mecanismos nativos de iOS y Android, soporta archivos virtuales y permite conservar una copia local del documento seleccionado.

**Estado:** recomendada.

El agente debe preferir la versión moderna:

```text
@react-native-documents/picker
```

y NO instalar variantes antiguas sin verificar primero qué utiliza el proyecto.

---

## 3.2 Lectura XLS / XLSX / CSV / TSV

### SheetJS Community Edition

Documentación React Native:

https://docs.sheetjs.com/docs/demos/mobile/reactnative/

Parsing:

https://docs.sheetjs.com/docs/api/parse-options/

API:

https://docs.sheetjs.com/docs/api/

SheetJS puede procesar spreadsheets en React Native y su parser de texto puede reconocer CSV, TSV, SSV y otros delimitadores.

**Estado:** recomendación principal.

Ventaja para juntoss:

> una sola capa puede cubrir XLS, XLSX y gran parte de CSV/TSV, evitando dependencias redundantes.

No instalar Papa Parse automáticamente. Evaluarlo solo si aparece un problema medido de rendimiento o streaming con archivos CSV grandes.

---

## 3.3 Acceso al filesystem

### Si juntoss usa Expo

Preferir:

https://docs.expo.dev/versions/latest/sdk/filesystem/

### Si es React Native bare

Evaluar:

https://github.com/alpha0010/react-native-file-access

La propia documentación de SheetJS muestra integración con `react-native-file-access`.

### Evitar por defecto

No añadir el viejo `react-native-fs` sin una justificación concreta y revisión de mantenimiento. Existen alternativas más actuales.

---

## 3.4 Fuzzy matching

### Fuse.js

https://github.com/krisk/fuse

Características relevantes:

- TypeScript;
- zero dependency;
- búsqueda fuzzy;
- ranking;
- orientado a datasets pequeños y medianos en cliente.

Con aproximadamente 2.000–3.000 aliases, el catálogo de juntoss es un caso razonable para búsqueda local.

**Estado:** recomendado para fallback fuzzy, nunca para sustituir exact matching.

---

## 3.5 Hashing

Para detectar archivos repetidos y fingerprints:

### Si usa Expo

https://docs.expo.dev/versions/latest/sdk/crypto/

### Alternativa JS

https://github.com/paulmillr/noble-hashes

No instalar otra dependencia si el proyecto ya dispone de SHA-256 fiable.

---

# 4. Proyectos open source estudiados

## Firefly III Data Importer

https://github.com/firefly-iii/data-importer

Es una referencia importante porque separa el importador del gestor financiero y soporta mappings y reglas.

Repositorio de configuraciones:

https://github.com/firefly-iii/import-configurations

El repositorio organiza configuraciones por país y banco y actualmente contiene, entre otros, perfiles para España, Brasil, Italia y Estados Unidos.

**Lección principal:**

```text
no intentar que todos los bancos tengan las mismas columnas;
usar perfiles y mappings reutilizables.
```

Licencia: AGPL-3.0.

Usarlo como referencia arquitectónica. NO copiar código sin revisar implicaciones de licencia.

---

## Beancount smart_importer

https://github.com/beancount/smart_importer

Este proyecto utiliza movimientos históricos como training data para predecir atributos de nuevas importaciones.

juntoss no necesita ML en esta fase, pero sí debe copiar el principio conceptual:

```text
historial del usuario
→ sugerencia
→ corrección
→ mejor sugerencia futura
```

La implementación de juntoss será determinista, basada en reglas y memoria personal.

---

# 5. Formatos soportados

## MVP obligatorio

```text
.xlsx
.xls
.csv
.tsv
```

## Opcional después del MVP

```text
.ods
.txt delimitado
```

## Explícitamente fuera de esta implementación

```text
.pdf
.jpg
.png
ocr
vision
llm
```

Si otro agente intenta añadir PDF durante esta fase, detener esa modificación.

---

# 6. Pipeline completo

```text
FILE PICKER
    ↓
COPY TO APP CACHE
    ↓
HASH FILE
    ↓
CHECK PREVIOUS IMPORT
    ↓
READ BYTES
    ↓
PARSE WORKBOOK/TEXT
    ↓
SELECT SHEET
    ↓
DETECT HEADER ROW
    ↓
DETECT/MAP COLUMNS
    ↓
NORMALIZE ROWS
    ↓
DETECT EXPENSE / INCOME
    ↓
NORMALIZE MERCHANT
    ↓
CATEGORY ENGINE
    ↓
DUPLICATE ENGINE
    ↓
IMPORT SESSION
    ↓
REVIEW
    ↓
BATCH COMMIT
    ↓
SAVE LEARNING
    ↓
SYNC
    ↓
REFRESH HOME / ACTIVITY / MAP
```

Cada etapa debe ser testeable por separado.

---

# 7. Procesamiento local primero

El archivo original debe procesarse en el dispositivo.

No subir XLS/XLSX/CSV a Supabase Storage por defecto.

```text
usuario elige archivo
→ copia temporal
→ parsing local
→ candidatos normalizados
→ archivo temporal eliminado
```

Lo que sí puede sincronizarse después:

- movimientos aprobados;
- sesión de importación;
- pendientes de revisión;
- reglas personales;
- feedback comunitario mínimo.

No el spreadsheet original.

---

# 8. Estructura de feature sugerida

```text
src/features/import/
├── screens/
│   ├── ImportStartScreen.tsx
│   ├── ImportMappingScreen.tsx
│   ├── ImportReviewScreen.tsx
│   └── ImportCenterScreen.tsx
├── components/
│   ├── ImportSummary.tsx
│   ├── ImportIssueBadge.tsx
│   └── ColumnMappingSheet.tsx
├── parsing/
│   ├── filePicker.ts
│   ├── spreadsheetReader.ts
│   ├── sheetDetector.ts
│   ├── headerDetector.ts
│   └── columnMapper.ts
├── normalization/
│   ├── normalizeHeader.ts
│   ├── normalizeDate.ts
│   ├── normalizeAmount.ts
│   ├── normalizeDescription.ts
│   └── normalizeMerchant.ts
├── categorization/
│   ├── categorizeTransaction.ts
│   ├── exactMatcher.ts
│   ├── fuzzyMatcher.ts
│   ├── userRuleMatcher.ts
│   ├── countryRuleMatcher.ts
│   └── scoring.ts
├── duplicate/
│   ├── fileFingerprint.ts
│   ├── transactionFingerprint.ts
│   └── duplicateDetector.ts
├── context/
│   ├── schema.ts
│   ├── index.ts
│   ├── global/
│   └── countries/
├── learning/
│   ├── learningService.ts
│   ├── learningCache.ts
│   └── communityFeedback.ts
├── repositories/
├── model/
└── types.ts
```

No crear carpetas vacías por anticipación.

---

# 9. Reutilización de UI — OBLIGATORIA

Antes de crear componentes nuevos, buscar equivalentes existentes:

```text
Screen
SettingsCard
SettingsRow
ListRow
TransactionRow
CategoryPicker
DatePicker
Button
Modal
BottomSheet
Divider
Badge
EmptyState
ErrorState
LoadingState
```

No crear `ImportedTransactionCard`, `NewCategoryPicker` o equivalentes si ya existe un componente reutilizable.

> **Screens orquestan. Componentes pintan. Dominio decide.**

---

# 10. Centro de importaciones

Por ahora debe existir dentro de Ajustes.

```text
Ajustes
  → Importaciones
```

Contenido:

```text
Pendientes de revisar
Completadas
Con problemas
```

Ejemplo:

```text
9 ago 2026
Excel · 126 movimientos
6 por revisar
```

No es necesario guardar el filename original completo en la nube. Puede contener identificadores o partes de cuentas.

Preferir labels:

```text
Excel · 9 ago 2026
CSV · 2 ago 2026
```

---

# 11. Estados de una importación

```ts
type ImportStatus =
  | 'parsing'
  | 'mapping_required'
  | 'needs_review'
  | 'ready'
  | 'imported'
  | 'failed'
  | 'cancelled';
```

El usuario debe poder cerrar la app en `needs_review` y continuar después.

---

# 12. Modelo intermedio

Nunca insertar una fila del Excel directamente en `transactions`.

```ts
type ImportedTransactionCandidate = {
  id: string;
  sourceRow: number;
  sheetName: string;

  rawDescription: string | null;
  normalizedMerchant: string | null;

  rawDate: unknown;
  occurredOn: string | null;

  rawAmount: unknown;
  amountMinor: number | null;
  currency: string | null;

  type: 'expense' | 'income' | 'unknown';

  suggestedCategoryKey: string | null;
  suggestedCategoryId: string | null;
  categoryConfidence: number;

  duplicateStatus: 'none' | 'exact' | 'probable';
  duplicateTransactionId?: string;

  issues: string[];
};
```

Después del review:

```text
ImportedTransactionCandidate
→ existing CreateTransactionInput
→ existing transaction repository
```

---

# 13. Headers bancarios

No asumir:

```text
Fecha | Concepto | Importe
```

Crear alias sets.

## Fecha

```text
fecha
fecha operación
fecha operacion
fecha movimiento
fecha valor
date
transaction date
operation date
booking date
value date
posted date
```

Preferir `transaction / operation / booking date` antes que `value date`.

## Descripción

```text
concepto
descripción
descripcion
detalle
movimiento
comercio
beneficiario
description
details
merchant
payee
beneficiary
transaction
memo
narrative
```

## Importe

```text
importe
monto
cantidad
amount
value
```

## Gasto / débito

```text
cargo
débito
debito
debit
withdrawal
outflow
money out
```

## Ingreso / crédito

```text
abono
crédito
credito
credit
deposit
inflow
money in
```

## Saldo

```text
saldo
balance
running balance
available balance
```

## Moneda

```text
moneda
divisa
currency
ccy
```

## Referencia externa

```text
referencia
id movimiento
transaction id
reference
external id
operation id
```

---

# 14. Detección del header

No asumir que está en row 1.

Ejemplo realista:

```text
Cuenta: XXXX
Periodo: ...
Titular: ...

Fecha | Concepto | Importe
```

Algoritmo:

```text
examinar primeras N filas
→ normalizar celdas
→ score por coincidencias
→ elegir fila con mayor score
```

Ejemplo de scoring:

```text
+2 fecha
+2 description
+2 amount
+1 debit
+1 credit
+1 balance
```

Exigir threshold. Si no se alcanza → `mapping_required`.

---

# 15. Column mapping manual

Pantalla:

```text
Ayúdanos a entender este archivo

Fecha        [Fecha operación ▾]
Descripción  [Concepto ▾]
Importe      [Importe ▾]
Moneda       [EUR ▾]
```

o:

```text
Gastos       [Cargo ▾]
Ingresos     [Abono ▾]
```

Guardar el mapping para próximos archivos con la misma estructura.

---

# 16. Bank profile fingerprint

Cuando el usuario confirma un mapping, crear fingerprint del formato:

```text
normalized headers
column count
relative column order
sheet signature
```

NO del filename.

Ejemplo:

```text
fecha_operacion|fecha_valor|concepto|importe|saldo
```

La próxima vez que aparezca esa estructura:

→ mapping automático.

---

# 17. Fechas

`occurred_on` debe ser:

```text
YYYY-MM-DD
```

No convertir una fecha financiera a UTC timestamp innecesariamente.

Un movimiento de `2026-08-09` debe seguir siendo `2026-08-09` independientemente de timezone.

---

# 18. Fechas ambiguas

```text
03/04/2026
```

puede ser 3 abril o 4 marzo.

Resolver usando:

1. formato real de celda XLS/XLSX;
2. locale del perfil bancario;
3. país;
4. otras fechas inequívocas del archivo;
5. configuración del usuario;
6. confirmación.

Nunca adivinar silenciosamente.

---

# 19. Importes

Nunca usar `float` en persistencia.

```text
€ 12,50
→ 1250
```

Soportar:

```text
1.234,56
1,234.56
-12,50
(12.50)
12,50-
```

y columnas separadas debit/credit.

---

# 20. Expense vs income

Orden:

```text
1. columnas debit/credit
2. signo explícito
3. semántica de columna
4. running balance
5. reglas conocidas
6. unknown
```

Nunca inferir gasto/ingreso únicamente desde la categoría.

---

# 21. MCC como señal opcional

Algunos exports pueden incluir Merchant Category Code.

Si existe una columna `MCC` / `merchant category code`, usarla como señal fuerte.

Mastercard mantiene una API/listado de MCC y Visa publica grupos de merchant categories.

Fuentes:

https://developer.mastercard.com/places/documentation/api-reference/

https://developer.visa.com/request_response_codes

No asumir que todos los bancos incluyen MCC.

---

# 22. Context engine sin IA

Arquitectura:

```text
GLOBAL CONTEXT
      +
COUNTRY CONTEXT
      +
USER LEARNING
      +
TRANSACTION CONTEXT
      ↓
CATEGORY SCORE
```

---

# 23. No usar un único JSON gigante

```text
src/features/import/context/
├── global/
│   ├── generic.es.json
│   ├── generic.pt.json
│   ├── generic.it.json
│   └── generic.en.json
└── countries/
    ├── es.json
    ├── ve.json
    ├── co.json
    ├── ec.json
    ├── pe.json
    ├── br.json
    ├── us.json
    ├── it.json
    └── pt.json
```

---

# 24. Objetivo del dataset

Crear **mínimo 2.000 aliases únicos normalizados**.

Objetivo recomendado:

```text
Global generic     350
España             450
Venezuela          350
Colombia           200
Ecuador            150
Perú               175
Brasil             250
Estados Unidos     200
Italia             125
Portugal           150
----------------------
Target total      2400
```

Tras deduplicar:

> mínimo 2.000 aliases únicos.

España y Venezuela tienen prioridad.

---

# 25. Qué cuenta como alias

No solo marcas.

```text
mercadona
mercadona sa
supermercado mercadona
```

pueden apuntar al mismo merchant.

También términos genéricos:

```text
farmacia
pharmacy
farmácia
farmacia comunale
```

Y payment rails:

```text
bizum
pix
mb way
ach
```

Pero esos términos NO deben traducirse directamente a una categoría de gasto.

---

# 26. Schema de regla contextual

```ts
type ContextRule = {
  id: string;
  countries: string[];
  aliases: string[];
  normalizedMerchant?: string;
  categoryKey?: CanonicalCategoryKey;
  kind:
    | 'merchant'
    | 'generic_keyword'
    | 'payment_rail'
    | 'transfer_hint'
    | 'income_hint'
    | 'fee_hint';
  typeHint?: 'expense' | 'income' | 'transfer';
  confidence: number;
  priority: number;
  negativeTokens?: string[];
};
```

---

# 27. Canonical categories

El dataset global NO debe almacenar IDs de categorías de Supabase.

Usar keys semánticas estables.

Si coinciden con la taxonomía real del producto:

```text
salary
freelance
groceries
housing
transport
utilities
restaurants
shopping
health
savings
family
leisure
education
subscriptions
travel
pets
debts
other
```

El agente debe verificar los slugs reales del proyecto.

No crear una taxonomía paralela si ya existe una equivalente.

---

# 28. CategoryResolver

```text
canonical category key
      ↓
categoría real del activeSpace
```

Si la categoría no existe:

- no crearla automáticamente;
- usar `null`;
- permitir elección del usuario.

---

# 29. Normalización de comercio

Entrada:

```text
PAGO TARJETA 1234 MERCADONA 0456 MADRID ES
```

Resultado de matching:

```text
mercadona
```

Pipeline:

```text
lowercase
unicode normalize
remove diacritics in matching copy
collapse whitespace
remove obvious card suffix
remove long technical refs
remove transaction boilerplate
preserve useful merchant tokens
```

Conservar también `rawDescription` para UI.

---

# 30. No eliminar números indiscriminadamente

Pueden formar parte del merchant:

```text
7-eleven
100 montaditos
365
```

Eliminar solo patrones identificados como reference, terminal, card suffix o auth code.

---

# 31. Stopwords transaccionales

Español:

```text
pago
compra
tarjeta
operacion
operación
tpv
pos
debito
débito
credito
crédito
```

Portugués:

```text
pagamento
compra
cartao
cartão
operacao
operação
debito
débito
credito
crédito
```

Italiano:

```text
pagamento
acquisto
carta
operazione
addebito
accredito
```

Inglés:

```text
payment
purchase
card
transaction
debit
credit
```

No remover una stopword si es la única información útil.

---

# 32. Contexto regional de pagos

## España — Bizum

Fuente oficial:

https://bizum.com/

`Bizum` identifica un medio de pago/transferencia, no una categoría final.

```text
BIZUM A MARIA
```

puede representar una cena, alquiler, regalo o transferencia.

No categorizar por `bizum` solamente.

---

## Brasil — Pix

Fuente oficial:

https://www.bcb.gov.br/estabilidadefinanceira/pix

`PIX MERCADO X` debe intentar extraer `MERCADO X` como merchant útil.

---

## Portugal — MB WAY

Fuente oficial:

https://www.mbway.pt/

MB WAY permite compras y transferencias. No categorizar `MB WAY` por sí solo.

---

## Estados Unidos — ACH

Fuente oficial:

https://www.nacha.org/

ACH puede representar payroll, bills, transferencias, seguros, hipoteca, etc.

El descriptor posterior es más importante que `ACH`.

---

# 33. Ejemplos de scoring

## Mercadona

```text
exact merchant match
country = ES
category = groceries
confidence alta
```

## Amazon

`Amazon` es ambiguo.

Puede ser shopping, groceries, subscriptions, digital services o refund.

Regla global sugerida:

```text
shopping
confidence media
```

Nunca high confidence solo por la palabra Amazon.

La corrección personal domina después.

---

# 34. El importe NO define categoría

No hacer:

```text
if amount < 5 EUR:
  category = business
```

Un movimiento pequeño puede ser café, transporte, farmacia, fee, supermercado o parking.

Si existe una categoría personal `Business`/`Negocio`, debe asignarse por merchant/contexto aprendido, no por tamaño del importe.

El importe puede ser una señal débil para desempates concretos, nunca la regla principal.

---

# 35. Orden de categorización

```text
1. regla manual explícita del usuario
2. merchant personal aprendido
3. MCC si existe
4. merchant exacto country pack
5. merchant exacto global
6. keyword country pack
7. keyword global
8. fuzzy merchant personal
9. fuzzy merchant global
10. recurring pattern
11. null / revisar
```

---

# 36. Scoring conceptual

```text
user exact rule          +100
MCC strong mapping        +80
country merchant exact    +75
global merchant exact     +70
country keyword           +45
global keyword            +35
strong fuzzy personal     +50
strong fuzzy global       +30
recurring signal          +15
amount heuristic           +5 max
```

Centralizar valores en `categorizationConfig.ts` y calibrarlos con tests.

---

# 37. Confidence bands

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

```text
HIGH    → preseleccionar
MEDIUM  → preseleccionar + fácil cambiar
LOW     → revisar
UNKNOWN → sin categoría
```

No mostrar números de confidence al usuario.

---

# 38. Aprendizaje personal

Ejemplo:

```text
AMZN Mktp
→ Compras
```

Guardar:

```text
normalizedMerchant = amazon
categoryKey = shopping
```

La próxima importación debe usar esta regla antes del dataset global.

---

# 39. Persistencia local + nube

El aprendizaje personal debe ser:

```text
local-first
+
Supabase sync
```

Flujo:

```text
usuario confirma categoría
→ guardar local inmediatamente
→ actualizar UI
→ sync Supabase
```

Así funciona offline y sobrevive al cambio de dispositivo.

---

# 40. Usuario invitado

Sin cuenta:

```text
reglas personales = local only
```

Al crear cuenta:

```text
migrar reglas locales
→ Supabase
→ idempotente
```

---

# 41. Tabla `user_merchant_rules`

Conceptualmente:

```text
id
user_id
space_id
country_code
normalized_merchant
canonical_category_key
category_id
confirmations
source
created_at
updated_at
last_used_at
```

Unique recomendado:

```text
user_id + space_id + normalized_merchant
```

El agente debe adaptar nombres/FKs al schema real.

---

# 42. Cambio de categoría

Si antes:

```text
amazon → shopping
```

y el usuario después elige:

```text
amazon → leisure
```

NO crear dos reglas activas.

Actualizar la existente.

Última corrección explícita gana.

---

# 43. Feedback comunitario

Separar totalmente:

```text
personal rule
≠
community vote
≠
global production dictionary
```

Flujo:

```text
usuario corrige
      ↓
personal rule
      ↓
private community vote
      ↓
aggregate
      ↓
candidate
      ↓
manual review
      ↓
future global context release
```

---

# 44. Nunca actualizar global directamente desde móvil

Esto evita:

- errores;
- spam;
- poisoning;
- categorías personales;
- un usuario dominando la base global.

---

# 45. Un usuario = un voto actual por merchant

No contar 50 votos porque una persona importó 50 movimientos iguales.

La persona puede tener `confirmations = 50`, pero para consenso comunitario representa **un usuario único**.

---

# 46. `merchant_feedback_votes`

Tabla privada:

```text
user_id
country_code
normalized_merchant
canonical_category_key
confirmations
created_at
updated_at
```

Unique:

```text
user_id + country_code + normalized_merchant
```

Si cambia de categoría, UPDATE del voto actual.

---

# 47. Custom categories y comunidad

Una categoría personal:

```text
Comidas con Laura
```

no debe convertirse en categoría global.

Para consenso usar `canonical_category_key`.

Si no hay parent canónico:

```text
community feedback = skip
```

La regla personal sí se guarda.

---

# 48. `merchant_feedback_aggregates`

Campos:

```text
country_code
normalized_merchant
canonical_category_key
unique_users
total_confirmations
updated_at
```

No guardar:

```text
amount
date
balance
account
raw statement
username
```

---

# 49. Cómo rellenar agregados automáticamente

NO hacer desde cliente:

```text
select count
+1
update
```

porque genera race conditions.

Usar una función Postgres/RPC:

```text
record_merchant_feedback(...)
```

Debe:

1. autenticar;
2. validar input;
3. leer voto anterior;
4. insertar/actualizar voto;
5. descontar aggregate anterior si cambió categoría;
6. incrementar aggregate nuevo;
7. evaluar threshold;
8. hacerlo de forma transaccional.

Fuentes Supabase:

https://supabase.com/docs/guides/database/functions

https://supabase.com/docs/guides/database/postgres/triggers

---

# 50. RLS

Todas las tablas personales deben usar Row Level Security.

Fuente:

https://supabase.com/docs/guides/database/postgres/row-level-security

Política conceptual:

```text
user_merchant_rules
→ usuario solo ve/modifica las suyas

merchant_feedback_votes
→ usuario registra/modifica su propio voto
→ no puede listar votos de otros

merchant_feedback_aggregates
→ no writable desde cliente

global_rule_candidates
→ no writable desde cliente
```

---

# 51. `SECURITY DEFINER`

Usarlo únicamente si la RPC necesita modificar tablas agregadas no escribibles directamente por el usuario.

Debe:

- fijar `search_path`;
- validar `auth.uid()`;
- limitar argumentos;
- no aceptar un `user_id` arbitrario enviado por cliente.

---

# 52. Thresholds comunitarios

No promover automáticamente.

Configuración inicial sugerida:

```text
candidate:
  unique_users >= 20
  consensus >= 0.85

strong candidate:
  unique_users >= 50
  consensus >= 0.90
```

Solo crear candidato.

La publicación global requiere revisión manual.

---

# 53. Ejemplo de consenso

```text
merchant = mercadona
shopping = 2
groceries = 142
other = 1
```

`groceries` es un candidato fuerte.

Pero:

```text
shopping = 40
groceries = 35
other = 25
```

no tiene suficiente consenso.

---

# 54. Anti-poisoning

El feedback comunitario solo debe originarse cuando:

- existe un movimiento real;
- pertenece a una importación/space autorizado;
- el usuario eligió explícitamente una categoría;
- el merchant normalizado tiene calidad mínima.

La RPC final debería preferir:

```text
record_merchant_feedback(import_item_id, canonical_category_key)
```

en vez de aceptar merchant arbitrario desde el cliente.

---

# 55. Privacidad comunitaria

No guardar para aprendizaje global:

```text
amount
date
balance
account number
IBAN
full raw description
filename
```

Guardar únicamente lo mínimo para consenso.

El `user_id` puede existir en la tabla privada para unicidad, pero no debe exponerse en aggregates.

---

# 56. Candidate review del desarrollador

Debe existir una consulta/admin tool, no una pantalla pública.

Ejemplo:

```text
Merchant     Country  Category      Users  Consensus
mercadona    ES       groceries     142    98.6%
xxxxx        VE       restaurants    55    92.1%
```

El desarrollador revisa y, si procede, añade la regla a un pack JSON en una futura release.

---

# 57. Construcción del dataset 2.000+

El agente encargado del contexto debe:

1. crear keywords genéricas;
2. añadir payment rails;
3. añadir comercios frecuentes por país;
4. añadir aliases de esos comercios;
5. cubrir especialmente:
   - supermercado;
   - farmacia;
   - combustible;
   - transporte;
   - restaurantes;
   - delivery;
   - retail;
   - telecom;
   - utilities;
   - streaming;
   - educación;
   - viajes;
6. marcar confidence;
7. ejecutar validator.

No se deben inventar negocios.

---

# 58. Fuentes del dataset

Prioridad:

```text
1. sitio oficial del comercio/servicio
2. información oficial de empresa
3. repositorios open source de mappings como referencia
4. consenso comunitario validado
```

No raspar extractos bancarios de usuarios.

No copiar datasets con licencias incompatibles.

---

# 59. Validator obligatorio

Crear:

```text
scripts/validate-import-context.ts
```

Comprobar:

```text
aliases únicos >= 2000
IDs únicos
country codes válidos
confidence 0..1
categoryKey válida
sin alias vacío
sin alias demasiado corto
sin categorías inexistentes
sin conflictos HIGH confidence
sin duplicados normalizados
```

---

# 60. Conflict detector

Si aparece:

```text
amazon → shopping 0.85
amazon → subscriptions 0.95
```

el build debe exigir resolución.

Un alias ambiguo puede tener múltiples hints, pero no dos reglas contradictorias de alta confianza.

---

# 61. Country resolution

Elegir pack mediante:

1. país del perfil de importación;
2. currency;
3. locale;
4. perfil del banco;
5. preferencia del usuario.

No usar GPS.

Una persona puede vivir en España e importar una cuenta de otro país.

---

# 62. Loading local

No hacer consultas Supabase por movimiento.

Mantener en memoria:

```text
globalExactMap
countryExactMap
userExactMap
fuzzyIndex
```

---

# 63. Exact antes de fuzzy

```text
exact hit
→ return

exact miss
→ fuzzy
```

Fuse.js no debe sustituir un `Map`.

---

# 64. Recurrencia

Mismo merchant + aproximadamente cada 30 días + importe similar puede aumentar score de suscripción.

Pero recurrencia por sí sola nunca decide porque puede ser:

- alquiler;
- sueldo;
- préstamo;
- seguro;
- gimnasio.

---

# 65. Nómina / salario

Ejemplos:

Español:

```text
nomina
nómina
salario
sueldo
```

Portugués:

```text
salario
salário
ordenado
```

Italiano:

```text
stipendio
salario
```

Inglés:

```text
payroll
salary
direct deposit
```

Combinar con `income` y recurrencia para confianza alta.

---

# 66. Transferencias

Hints:

```text
transfer
transferencia
traspaso
pix
bizum
mb way
ach
wire
sepa
```

No clasificarlas como expense automáticamente.

Si el modelo actual no soporta transferencias:

→ `needs_review`.

---

# 67. Duplicados: archivo completo

Calcular SHA-256 del archivo y guardar `file_hash` en la sesión.

Si el mismo hash ya existe:

```text
Este archivo ya se importó anteriormente.
```

No volver a insertar silenciosamente.

---

# 68. Duplicados: movimiento

### Exacto

Si existe `external_transaction_id` estable y coincide → exact duplicate.

### Strong fingerprint

Usar:

```text
source profile
date
amountMinor
currency
bank reference
normalized merchant
```

### Nombre + fecha + importe

NO es suficiente para ignorar automáticamente.

Dos compras reales pueden tener el mismo merchant, importe y día.

Debe ser `probable duplicate`.

---

# 69. Transaction fingerprint

Canonical string:

```text
source_profile
|occurred_on
|amount_minor
|currency
|external_reference
|normalized_merchant
```

Después SHA-256.

No incluir `created_at`.

---

# 70. Import summary

```text
126 movimientos encontrados

105 listos
14 necesitan revisión
7 posibles repetidos
```

Exact duplicates → deseleccionados por defecto.

Probables → revisar.

---

# 71. Bulk categorization

Si aparecen 18 movimientos normalizados como `mercadona` sin regla personal:

```text
Vimos Mercadona 18 veces.
¿En qué categoría quieres ponerlo?
```

Al elegir:

```text
Supermercado
```

aplicar a todas las filas de la sesión y crear regla personal.

---

# 72. Agrupación de desconocidos

Agrupar por `normalizedMerchant`, no por descripción raw.

Esto reduce mucho la carga del usuario.

---

# 73. Import Center data

Conceptualmente:

```text
import_batches
import_items
```

`import_batches`:

```text
id
user_id
space_id
file_hash
source_type
source_profile
status
total_items
review_items
duplicate_items
created_at
updated_at
completed_at
```

`import_items`:

```text
id
batch_id
source_row
raw_description
normalized_merchant
occurred_on
amount_minor
currency
type
suggested_category_key
final_category_id
duplicate_status
duplicate_transaction_id
status
created_transaction_id
issues
```

---

# 74. Retención

No guardar row JSON completo.

Conservar solo lo necesario para:

- revisión;
- trazabilidad;
- continuar una importación.

No conservar el spreadsheet original.

---

# 75. SQL migration requerida

El agente debe generar una migration real:

```text
supabase/migrations/<timestamp>_import_learning_system.sql
```

Antes debe revisar:

```text
spaces
categories
transactions
profiles/users
existing RLS helpers
naming conventions
```

Este paquete incluye además:

```text
JUNTOSS_IMPORT_LEARNING_SCHEMA_TEMPLATE.sql
```

como blueprint, **no para ejecutar a ciegas**.

---

# 76. Idempotencia

Una importación debe poder reintentarse sin duplicar.

Usar:

- exact fingerprints cuando sean realmente exactos;
- import batch ID;
- commit transaccional/RPC;
- `ON CONFLICT` cuando aplique.

PostgreSQL documenta `INSERT ... ON CONFLICT DO UPDATE` como operación atómica para el conflicto correspondiente.

Fuente:

https://www.postgresql.org/docs/current/sql-insert.html

---

# 77. Batch commit

No diseñar:

```text
for each row:
  await insert()
```

como solución final.

Preferir `commit_import_batch(...)` o el mecanismo batch existente.

Backend debe validar:

```text
user
membership
category
amount
date
currency
duplicate
author
```

---

# 78. Mapa

El Mapa debe usar `occurred_on`, no `created_at`.

Un movimiento de mayo importado en agosto debe aparecer en mayo inmediatamente.

Después del commit:

```text
invalidate transactions
invalidate balances
invalidate activity
invalidate map
```

usando el sistema actual.

---

# 79. Active Space

Antes de importar mostrar discretamente:

```text
Importar en: Personal
```

La sesión pertenece al activeSpace.

Si cambia durante review:

- bloquear temporalmente;
- o pedir confirmación y reiniciar.

Nunca mover silenciosamente una importación a otro espacio.

---

# 80. Seguridad

No loggear:

```text
rows
merchant raw
amount
balance
IBAN
account
reference
filename
```

Logs permitidos:

```text
file type
row count
duration
parser
error code
batch id
```

---

# 81. CSV quirks

Soportar:

```text
comma
semicolon
tab
pipe cuando corresponda
```

SheetJS documenta heurísticas para formatos delimitados y permite fijar delimiter cuando sea necesario.

Probar:

- UTF-8;
- BOM;
- Windows-1252;
- caracteres españoles;
- portugués;
- italiano.

---

# 82. Fórmulas y macros

No ejecutar macros.

No ejecutar VBA.

No evaluar código desde el workbook.

Leer valores.

No soportar `.xlsm` inicialmente salvo necesidad explícita y revisión.

---

# 83. Límites iniciales

A validar mediante profiling:

```text
XLS/XLSX: 15 MB
CSV/TSV:  10 MB
Rows:     20,000
Sheets:   20
```

Son guardrails de producto, no límites de plataforma.

---

# 84. Errores de dominio

```text
unsupported_file
file_too_large
file_already_imported
corrupt_spreadsheet
no_valid_sheet
headers_not_found
mapping_required
date_format_unknown
amount_format_unknown
currency_unknown
no_transactions_found
too_many_invalid_rows
commit_failed
```

---

# 85. Copy sugerido

### Entrada

**Importar movimientos**

> Añade varios gastos e ingresos desde un archivo de tu banco.

### Procesando

**Estamos ordenándolo todo**

> Buscando fechas, importes y movimientos.

### Mapping

**Ayúdanos a entender este archivo**

> Solo necesitamos saber dónde está cada dato.

### Review

**Revisa antes de importar**

> Dejamos listos los movimientos que pudimos reconocer.

### Repetidos

**Parece que algunos ya están en juntoss**

> Los hemos separado para que no los añadas dos veces.

### Éxito

**Todo listo**

> Tus movimientos ya están en juntoss.

---

# 86. Fixtures

Nunca subir extractos reales al repositorio.

```text
tests/fixtures/import/
├── xlsx/
├── xls/
├── csv/
├── tsv/
└── expected/
```

Todo debe usar datos ficticios.

---

# 87. Tests de headers

- header row 1;
- header row 5;
- columnas extra;
- columnas reordenadas;
- español;
- portugués;
- italiano;
- inglés;
- Cargo/Abono;
- Debit/Credit;
- signed amount.

---

# 88. Tests de fechas

- DD/MM/YYYY;
- MM/DD/YYYY;
- YYYY-MM-DD;
- Excel serial;
- leap year;
- ambiguous;
- timezone;
- value vs operation date.

---

# 89. Tests de importes

- `1.234,56`;
- `1,234.56`;
- `-12,50`;
- `(12.50)`;
- separate debit;
- separate credit;
- zero;
- missing.

---

# 90. Tests de categorías

- exact global;
- exact country;
- user override;
- MCC;
- fuzzy;
- ambiguous merchant;
- recurring;
- custom category;
- missing canonical category;
- no match.

---

# 91. Tests de comunidad

- mismo usuario confirma 20 veces → 1 usuario único;
- 20 usuarios → 20 votos;
- usuario cambia categoría;
- aggregate baja categoría anterior;
- aggregate sube nueva;
- threshold crea candidato;
- RLS bloquea otros votos;
- cliente no puede editar aggregates.

---

# 92. Tests de duplicados

- mismo archivo dos veces;
- mismo external ID;
- archivos solapados;
- dos compras legítimas iguales;
- filename distinto, bytes iguales;
- CSV modificado, rows parcialmente repetidos.

---

# 93. Performance

Probar en dispositivo real:

```text
500 rows
2,000 rows
10,000 rows
20,000 rows
```

Medir:

```text
parse time
normalization time
categorization time
UI freeze
memory
```

No mover a backend únicamente porque un emulador lento tenga problemas.

---

# 94. Performance del contexto

Exact matcher con `Map`.

Fuzzy solo en misses.

No ejecutar Fuse sobre todo para movimientos que ya tienen exact match.

---

# 95. Privacidad/legal

Actualizar la documentación legal para explicar:

- importación de archivos;
- procesamiento local;
- datos derivados;
- reglas personales sincronizadas;
- feedback comunitario;
- qué NO se envía;
- cómo eliminar aprendizaje.

Con esta arquitectura:

```text
archivo original = local
movimientos/reglas aprobados = pueden sincronizarse
```

---

# 96. Implementación por pasos — NO saltar fases

## STEP 0 — Auditoría

Crear:

```text
IMPORT_IMPLEMENTATION_STATE.md
```

Documentar arquitectura actual, componentes, schema y dependencias.

**STOP.**

---

## STEP 1 — File picker

Solo:

```text
pick XLS/XLSX/CSV/TSV
copy/cache
validate
```

Probar iOS + Android.

**STOP.**

---

## STEP 2 — Parser tabular

```text
SheetJS
sheet selection
header detection
column mapping
```

Sin categorías.

**STOP.**

---

## STEP 3 — Normalización financiera

```text
date
amount
currency
expense/income
description
```

Golden tests.

**STOP.**

---

## STEP 4 — Duplicate engine

```text
file hash
external reference
transaction fingerprint
probable duplicate
```

**STOP.**

---

## STEP 5 — Context engine base

```text
context schema
exact matcher
country packs
generic packs
Fuse fallback
```

Sin community.

**STOP.**

---

## STEP 6 — Dataset 2.000+

Construir packs y validator.

Criterio:

```text
unique normalized aliases >= 2000
```

España y Venezuela deben ser los packs con mayor cobertura.

**STOP.**

---

## STEP 7 — Personal learning local

```text
user correction
→ save local rule
→ reapply batch
```

**STOP.**

---

## STEP 8 — Supabase sync

Crear migration adaptada al schema.

Sincronizar:

```text
user_merchant_rules
import batches
pending items
```

Añadir RLS.

**STOP.**

---

## STEP 9 — Community learning

```text
merchant_feedback_votes
merchant_feedback_aggregates
global_rule_candidates
record_merchant_feedback RPC
```

No auto-promote.

**STOP.**

---

## STEP 10 — Import Center

Añadir fila a Ajustes reutilizando diseño actual.

Pantalla:

```text
pending
completed
issues
```

**STOP.**

---

## STEP 11 — Bulk review

```text
merchant repeated N times
→ categorize all
→ create user rule
```

**STOP.**

---

## STEP 12 — Commit

Usar el existing transaction path.

Batch + idempotencia.

**STOP.**

---

## STEP 13 — Refresh

Verificar:

```text
Home
Activity
Map
shared space behavior
```

**STOP.**

---

## STEP 14 — Privacy + release QA

Actualizar:

```text
privacy docs
SDK inventory
data inventory
licenses
```

Probar Android + iOS.

---

# 97. Mantener contexto entre agentes

Cada STEP debe actualizar:

```text
IMPORT_IMPLEMENTATION_STATE.md
```

Formato:

```md
# Current step

STEP 5

# Completed

- STEP 0
- STEP 1
- STEP 2
- STEP 3
- STEP 4

# Decisions

...

# Files changed

...

# Dependencies

...

# Database changes

...

# Known issues

...

# Next exact task

...
```

Un agente nuevo DEBE leer este archivo antes de continuar.

---

# 98. Qué NO hacer

- No PDF.
- No OCR.
- No IA generativa.
- No API bancaria en esta fase.
- No subir spreadsheet por defecto.
- No hardcodear categorías duplicadas.
- No usar importe como categoría principal.
- No ignorar movimientos solo por nombre+fecha+importe.
- No promover feedback global automáticamente.
- No permitir votos infinitos del mismo usuario.
- No meter 2.000 strings en un único `.ts`.
- No hacer una mega-PR con todos los STEPs.
- No hacer refactors ajenos.
- No reemplazar componentes existentes.
- No guardar credenciales bancarias.
- No guardar raw exports en logs.
- No usar `created_at` como fecha financiera.

---

# 99. Definition of Done

- [ ] XLS.
- [ ] XLSX.
- [ ] CSV.
- [ ] TSV.
- [ ] iOS.
- [ ] Android.
- [ ] headers automáticos.
- [ ] mapping manual.
- [ ] fechas correctas.
- [ ] minor units.
- [ ] expense/income.
- [ ] moneda.
- [ ] dataset >= 2.000 aliases.
- [ ] country packs.
- [ ] España priorizada.
- [ ] Venezuela priorizada.
- [ ] exact matching.
- [ ] fuzzy fallback.
- [ ] reglas personales.
- [ ] sync cross-device.
- [ ] community aggregation.
- [ ] unique-user voting.
- [ ] candidate review.
- [ ] file hash.
- [ ] exact/probable duplicates.
- [ ] Centro de importaciones.
- [ ] pending review persiste.
- [ ] bulk merchant categorization.
- [ ] batch idempotente.
- [ ] Home actualiza.
- [ ] Activity actualiza.
- [ ] Map usa fecha financiera.
- [ ] RLS.
- [ ] tests.
- [ ] privacidad actualizada.
- [ ] licencias actualizadas.

---

# 100. Decisión final de arquitectura

La solución recomendada para juntoss en esta fase es:

```text
parser determinista
+
normalización
+
diccionario global
+
contexto por país
+
fuzzy matching
+
aprendizaje personal
+
consenso comunitario
+
review humano
```

Esto permite velocidad, privacidad, coste operativo bajo, funcionamiento offline y personalización progresiva sin depender de IA generativa.

---

# 101. Fuentes principales

## React Native documents

https://react-native-documents.github.io/

https://github.com/react-native-documents/document-picker

## SheetJS

https://docs.sheetjs.com/docs/demos/mobile/reactnative/

https://docs.sheetjs.com/docs/api/

https://docs.sheetjs.com/docs/api/parse-options/

## Filesystem

https://docs.expo.dev/versions/latest/sdk/filesystem/

https://github.com/alpha0010/react-native-file-access

## Fuzzy matching

https://github.com/krisk/fuse

## Hashing

https://docs.expo.dev/versions/latest/sdk/crypto/

https://github.com/paulmillr/noble-hashes

## Firefly III

https://github.com/firefly-iii/data-importer

https://github.com/firefly-iii/import-configurations

## Learning reference

https://github.com/beancount/smart_importer

## Supabase

https://supabase.com/docs/guides/database/functions

https://supabase.com/docs/guides/database/postgres/triggers

https://supabase.com/docs/guides/database/postgres/row-level-security

## PostgreSQL

https://www.postgresql.org/docs/current/sql-insert.html

## MCC

https://developer.mastercard.com/places/documentation/api-reference/

https://developer.visa.com/request_response_codes

## Payment context

Spain / Bizum:
https://bizum.com/

Brazil / Pix:
https://www.bcb.gov.br/estabilidadefinanceira/pix

Portugal / MB WAY:
https://www.mbway.pt/

US / ACH:
https://www.nacha.org/

---

# 102. Regla final para el agente

> Si no estás seguro de una categoría, no inventes una categoría.

Un buen importador no es el que rellena todo. Es el que diferencia correctamente:

```text
sé esto
creo esto
no sé esto
```

y hace que corregir el tercer caso sea tan fácil que la próxima vez ya no tenga que preguntarlo.
