# JUNTOSS_BANK_FILE_IMPORT_SYSTEM.md

> **Estado:** especificación técnica + guía obligatoria para agentes de IA  
> **Fecha de investigación:** 8 de agosto de 2026  
> **Stack objetivo:** React Native · TypeScript · Supabase · iOS · Android  
> **Feature:** importar movimientos desde XLS/XLSX y CSV
>
> **Decisión registrada:** `Bible/DECISIONS.md` ADR-073 elimina por completo
> el soporte de PDF que este documento describe en las secciones 18–29, 77,
> 86 y otras referencias dispersas. Esas secciones quedan como investigación
> histórica de por qué se descartó (heurística best-effort, dependencia
> nativa joven, requisito de development build, errores recurrentes durante
> el desarrollo) y no deben usarse como guía para reimplementar PDF sin
> antes leer el ADR. Todo lo demás en este documento (Excel/CSV, pipeline,
> normalización, deduplicación, categorización) sigue vigente.

---

## 1. Objetivo

Construir un sistema de importación que permita al usuario seleccionar un archivo bancario y convertir sus movimientos en movimientos normales de `juntoss`.

Flujo esperado:

```text
Seleccionar archivo
→ Analizar
→ Detectar movimientos
→ Normalizar fecha/importe/tipo
→ Sugerir categoría
→ Detectar duplicados
→ Revisar dudas
→ Importar
→ Actualizar Inicio, Actividad y Mapa
```

El sistema debe reconocer, como mínimo:

- fecha
- descripción/concepto
- importe
- gasto o ingreso
- moneda
- categoría sugerida
- posibles transferencias
- posibles duplicados
- confianza de extracción
- confianza de categorización

El objetivo NO es que una IA “adivine y guarde”. El objetivo es un pipeline auditable y determinista siempre que sea posible.

---

## 2. Reglas obligatorias para el agente

Antes de implementar:

1. Leer `README.md`.
2. Leer `PROJECT_RULES.md`.
3. Leer `ARCHITECTURE.md`.
4. Leer `DATABASE.md`.
5. Buscar el modelo actual de `Transaction`.
6. Buscar el modelo actual de `Category`.
7. Buscar `activeSpace`.
8. Buscar la implementación actual de crear movimientos.
9. Buscar componentes visuales reutilizables.
10. Revisar dependencias existentes.

> **Nunca crear un segundo modelo de movimientos solo para importación.**

Los movimientos importados deben terminar utilizando el mismo contrato de creación que los movimientos manuales.

> **Nunca guardar automáticamente movimientos que no hayan pasado por normalización, deduplicación y validación.**

---

## 3. Principio de producto

La importación debe ahorrar trabajo.

Prioridades:

1. importe correcto
2. fecha correcta
3. gasto/ingreso correcto
4. evitar duplicados
5. categoría probable
6. revisión rápida
7. commit seguro

La categoría equivocada es corregible. Un importe o fecha incorrectos pueden alterar balance y Mapa.

---

## 4. Estrategia por formato

No usar una única estrategia.

Orden:

```text
Formato estructurado
→ XLS/XLSX/CSV
→ PDF digital
→ PDF escaneado
→ OCR
→ modelo/LLM como último fallback
```

Soportar en MVP (ADR-073: PDF eliminado del alcance):

- `.xlsx`
- `.xls`
- `.csv`

Fase posterior:

- OFX
- QFX
- CAMT.052
- CAMT.053 / ISO 20022
- MT940

Los formatos estructurados deben preferirse a PDF siempre que estén disponibles.

---

## 5. Arquitectura propuesta

```text
src/features/import/
├── screens/
│   ├── ImportFileScreen.tsx
│   ├── ImportAnalyzingScreen.tsx
│   ├── ImportReviewScreen.tsx
│   └── ImportResultScreen.tsx
├── components/
│   ├── ImportRow.tsx
│   ├── ImportSummary.tsx
│   ├── ImportIssueBadge.tsx
│   └── ColumnMappingSheet.tsx
├── parsers/
│   ├── parserRouter.ts
│   ├── spreadsheetParser.ts
│   ├── pdfParser.ts
│   └── csvParser.ts
├── normalization/
│   ├── normalizeDescription.ts
│   ├── normalizeAmount.ts
│   ├── normalizeDate.ts
│   └── normalizeTransaction.ts
├── categorization/
│   ├── categorizeTransaction.ts
│   ├── personalRules.ts
│   └── merchantRules.ts
├── deduplication/
│   ├── createFingerprint.ts
│   └── findDuplicates.ts
├── validation/
│   ├── validateImport.ts
│   └── reconcileStatement.ts
├── model/
└── types.ts
```

No crear carpetas vacías “por si acaso”.

---

## 6. Reutilización de UI — obligatoria

Antes de crear nuevos componentes, buscar:

- `Screen`
- `Card`
- `ListRow`
- `TransactionRow`
- `TransactionCard`
- `Button`
- `IconButton`
- `Modal`
- `BottomSheet`
- `Progress`
- `CategoryPicker`
- `EmptyState`
- `ErrorState`
- `ScreenHeader`

La pantalla de revisión debe reutilizar el componente visual de movimientos si ya existe.

No crear un `ImportedTransactionCard` con estilos duplicados salvo que tenga una responsabilidad realmente distinta.

---

## 7. Pipeline

```text
FILE PICKER
↓
VALIDATE FILE
↓
CREATE IMPORT SESSION
↓
PARSE
↓
RAW ROWS
↓
MAP STRUCTURE
↓
NORMALIZE
↓
DETECT EXPENSE / INCOME
↓
DETECT TRANSFERS
↓
CATEGORY INFERENCE
↓
DEDUPLICATION
↓
RECONCILIATION
↓
REVIEW
↓
BATCH COMMIT
↓
REFRESH APP STATE
```

Cada etapa debe tener tests independientes.

---

## 8. Selección de documentos

### Recomendación principal

`@react-native-documents/picker`

- React Native
- iOS y Android
- TypeScript
- PDF/XLS/XLSX/CSV
- `content://` Android
- archivos de Google Drive y otros providers
- mantenimiento activo
- licencia MIT

Documentación:

https://react-native-documents.github.io/docs/

Repositorio:

https://github.com/react-native-documents/document-picker

Restringir inicialmente a XLS, XLSX y CSV.

Al abrir la importación, mostrar primero una explicación breve: el usuario
sube un extracto, revisa movimientos, categorías y duplicados, y solo entonces
confirma el guardado. El selector nativo se abre exclusivamente tras pulsar la
acción explícita para elegir archivo; las revisiones guardadas siguen siendo
accesibles desde esa introducción.

Android puede tener providers que ignoran filtros MIME. Por eso validar después de seleccionar:

- extensión
- MIME
- tamaño
- estructura

No confiar solo en el filename.

---

## 9. Lifecycle del archivo

Preferir copia temporal en cache.

```text
pick
→ local temporary copy
→ process
→ commit
→ delete/release
```

No conservar permanentemente el extracto bancario.

No subirlo a Supabase Storage por defecto.

Si se procesa en backend:

- bucket privado o upload temporal
- acceso autenticado
- URL de corta duración
- eliminación al finalizar
- job de limpieza para residuos

---

## 10. Límites iniciales

Valores a validar mediante pruebas:

```text
PDF:       20 MB
XLS/XLSX:  15 MB
CSV:       10 MB
PDF pages: 100
Rows:      10,000
```

Centralizar configuración.

---

## 11. Excel — librería recomendada

### SheetJS Community Edition

Documentación React Native:

https://docs.sheetjs.com/docs/demos/mobile/reactnative/

Licencia:

Apache-2.0.

Ventajas:

- XLS/XLSX
- demo oficial para React Native
- lectura de fechas y celdas
- madura
- multiplataforma

**Recomendación:** usarla para la primera versión de importación Excel.

Registrar la atribución requerida por Apache-2.0 en el sistema de licencias de juntoss.

---

## 12. Excel: no asumir headers

Ejemplos posibles:

```text
Fecha | Concepto | Importe
```

```text
Date | Description | Debit | Credit | Balance
```

```text
Fecha operación | Fecha valor | Movimiento | Cantidad | Divisa
```

Implementar aliases.

### Fecha

```text
fecha
date
fecha operacion
fecha operación
operation date
transaction date
booking date
fecha movimiento
fecha valor
value date
```

Preferencia:

1. operation/transaction/booking date
2. value date como fallback

### Descripción

```text
concepto
descripcion
descripción
description
detalle
details
merchant
payee
beneficiary
beneficiario
movimiento
transaction
```

### Importe

```text
importe
amount
cantidad
monto
value
```

### Débito

```text
debit
debito
débito
cargo
withdrawal
outflow
```

### Crédito

```text
credit
credito
crédito
abono
deposit
inflow
```

### Moneda

```text
currency
moneda
divisa
ccy
```

### Saldo

```text
saldo
balance
running balance
```

---

## 13. Column mapping manual

Si no hay confianza suficiente:

```text
¿Dónde está cada dato?

Fecha           [Fecha operación ▾]
Descripción     [Concepto ▾]
Importe         [Importe ▾]
```

Si existen columnas separadas:

```text
Gastos          [Debit ▾]
Ingresos        [Credit ▾]
```

Guardar mappings reutilizables por estructura/banco cuando sea fiable.

---

## 14. Excel security

- No ejecutar macros.
- No soportar `.xlsm` inicialmente.
- No evaluar fórmulas.
- Tratar fórmulas y valores como datos.
- No ejecutar VBA.
- No extraer ZIP arbitrariamente por cuenta propia.

---

## 15. Fechas

La fecha financiera final debe ser:

```text
YYYY-MM-DD
```

Ejemplo:

```text
2026-08-08
```

No usar un UTC timestamp para `occurred_on`.

Esto evita que una fecha cambie de día por timezone.

Resolver:

- Excel serial
- DD/MM/YYYY
- MM/DD/YYYY
- YYYY-MM-DD
- celdas de fecha

Para una fecha ambigua como `03/04/2026`, usar:

1. formato de celda
2. locale
3. banco/país conocido
4. otras fechas no ambiguas del archivo
5. preferencia de usuario
6. confirmación

Nunca adivinar silenciosamente.

---

## 16. Importe

Nunca usar `float` como modelo final.

```text
12,50 EUR
→ amountMinor = 1250
→ currency = EUR
```

Soportar:

```text
1.234,56 €
€ 1,234.56
(45.20)
45,20-
```

Considerar:

- decimal comma
- decimal point
- thousand separator
- espacios
- símbolo monetario
- paréntesis negativos
- trailing minus


---

## 17. Gasto vs ingreso

No depender únicamente del signo.

Posibles formatos:

### Importe firmado

```text
-50 → gasto
+200 → ingreso
```

### Debit / Credit separados

```text
Debit=50 → gasto
Credit=200 → ingreso
```

### Cargo / Abono

```text
Cargo → gasto
Abono → ingreso
```

### PDF sin signo

Puede requerir:

- posición de columna
- running balance
- header visual
- patrón del banco

Si no se puede determinar con suficiente confianza:

```text
type = unknown
```

y se obliga a revisión.

---

# 18. PDF: distinguir tipos

Los PDFs bancarios pueden ser:

### Digitales
Texto seleccionable.

### Escaneados
Solo imágenes.

### Híbridos
Parte texto y parte imagen.

### Visuales
El texto existe, pero el orden extraído no coincide con la tabla visible.

Por eso no debe existir un único parser PDF universal.

---

## 19. PDF digital on-device

> **Decisión registrada:** `Bible/DECISIONS.md` ADR-069 descarta por ahora
> el soporte de PDF (ninguna opción on-device funciona dentro de Expo Go,
> el flujo de desarrollo actual del proyecto). La Fase 1 implementada solo
> cubre Excel/CSV. Leer el ADR antes de retomar esta sección.

Proyecto investigado:

`expo-pdf-text-extract`

Repositorio:

https://github.com/gr8pathik/expo-pdf-text-extract

Características observadas:

- MIT
- React Native
- PDFKit en iOS
- PDFBox en Android
- `file://`
- `content://`
- extracción por página
- soporte de PDF protegido
- sin OCR

### Evaluación

**Prometedor, pero relativamente joven.**

Antes de incorporarlo el agente debe realizar un spike:

```text
10-20 PDFs distintos
iOS
Android
content://
multi-page
password protected
RN New Architecture
performance
memory
```

No adoptar una dependencia solo porque su API parezca conveniente.

---

## 20. Backend para PDF digital

### `pdf-parse`

Repositorio:

https://github.com/mehmet-kozan/pdf-parse

Durante la investigación actual:

- TypeScript
- Node/browser
- extracción de texto
- extracción de tablas
- imágenes/screenshots
- Apache-2.0
- activo
- amplia adopción npm

### Recomendación

Buen candidato para un worker/backend de PDF digital.

No asumir que “browser compatible” significa “React Native compatible”.

---

## 21. PDF.js

Mozilla PDF.js:

https://github.com/mozilla/pdf.js

- Apache-2.0
- altamente maduro
- parsing/rendering
- utilizado por Firefox

Es primordialmente web.

Usarlo como:

- referencia
- backend
- tooling
- viewer WebView solo si existe una razón clara

No introducir una WebView compleja únicamente para leer estados bancarios si existe una ruta nativa más sencilla.

---

# 22. PDF escaneado — OCR

Si el texto por página es vacío o extremadamente pequeño:

```text
scannedCandidate = true
```

No determinarlo solo por filesize.

---

## 23. OCR iOS

Preferir Apple Vision cuando sea viable.

APIs:

- `RecognizeTextRequest`
- `VNRecognizeTextRequest`
- `RecognizeDocumentsRequest`

Fuentes:

https://developer.apple.com/documentation/vision/recognizetextrequest

https://developer.apple.com/documentation/vision/recognizedocumentsrequest

Apple también publica una muestra para reconocer tablas:

https://developer.apple.com/documentation/vision/recognize-tables-within-a-document

`RecognizeDocumentsRequest` puede devolver estructura de:

- palabras
- líneas
- párrafos
- tablas
- listas

Esto es especialmente interesante para estados bancarios.

### Recomendación

Si la versión mínima de iOS de juntoss lo permite, evaluar un pequeño adaptador nativo propio antes de instalar un wrapper poco mantenido.

---

## 24. OCR Android

Google ML Kit Text Recognition v2:

https://developers.google.com/ml-kit/vision/text-recognition/v2/android

Para captura física futura:

Google ML Kit Document Scanner:

https://developers.google.com/ml-kit/vision/doc-scanner/android

El scanner oficial:

- procesa on-device
- detecta bordes
- corrige rotación
- permite crop
- limpia documentos
- puede devolver JPEG y PDF
- reduce la necesidad de crear un scanner propio

Muy útil si en el futuro juntoss permite fotografiar un extracto impreso.

---

## 25. Wrapper OCR React Native investigado

`react-native-vision-camera-mlkit`

https://github.com/pedrol2b/react-native-vision-camera-mlkit

Observado:

- MIT
- OCR
- iOS/Android
- static image processing
- integración con Vision Camera
- mantenimiento reciente

### Regla

No instalar Vision Camera únicamente para OCR de un PDF sin medir coste y complejidad.

Si la app ya usa Vision Camera, la integración puede ser atractiva.

---

# 26. Candidato fuerte de backend: Bank Statement Parser

Repositorio:

https://github.com/sebastienrousseau/bankstatementparser

Licencia:

Apache-2.0.

Durante la investigación de agosto de 2026 el proyecto mostraba actividad reciente y una arquitectura enfocada específicamente en bank statements.

Características:

- CSV
- CAMT / ISO 20022
- PAIN.001
- OFX/QFX
- MT940
- PDF digital
- PDF escaneado
- modelo unificado de transacción
- deduplicación
- revisión
- page provenance
- validación de saldos
- categorización
- REST API
- LLM opcional
- vision fallback
- PII redaction
- security controls

Arquitectura relevante:

```text
deterministic parser
→ text parsing
→ LLM fallback
→ vision fallback
```

### Recomendación

**Es el proyecto open source más completo encontrado como referencia directa para esta feature.**

Evaluar dos opciones:

### A. Usarlo como referencia
Replicar arquitectura en TypeScript/nativo.

### B. Microservicio Python
```text
React Native
→ Juntoss Import API
→ Bank Statement Parser
→ NormalizedImportResult
```

No exponer su REST API directamente a Internet sin:

- auth
- rate limiting
- authorization
- upload limits
- cleanup
- monitoring

El propio proyecto indica que auth/rate limiting no forman parte de su microservicio por defecto.

---

# 27. Supabase Edge Functions

No usar Edge Functions automáticamente para OCR/PDF pesado.

Documentación actual:

https://supabase.com/docs/guides/functions/limits

Entre los límites documentados se encuentran memoria y CPU por request.

### Usar Edge Functions para:

- autenticar
- crear un import job
- firmar upload
- commit
- validación ligera

### Considerar worker dedicado para:

- OCR
- PDF rendering
- visión
- parsing pesado
- grandes lotes

---

# 28. Privacidad arquitectónica

Orden preferido:

```text
1. On-device
2. Backend propio temporal
3. IA externa solo como fallback explícito
```

Un extracto bancario puede contener:

- nombres
- cuentas
- comercios
- patrones de gasto
- salarios
- balances
- ubicaciones

No enviar el documento completo a un proveedor de IA por defecto.

Si alguna parte sale del dispositivo:

- documentar proveedor
- actualizar política de privacidad
- actualizar Data Inventory
- revisar Google Data Safety
- revisar Apple App Privacy
- aplicar retención mínima

---

# 29. Password-protected PDF

Si un PDF requiere password:

- pedir password temporalmente
- no persistir
- no analytics
- no logs
- no Supabase
- limpiar después
- nunca guardar en secure storage como conveniencia

Nunca pedir:

- contraseña bancaria
- PIN
- credenciales de banca online

Solo la contraseña del archivo que el usuario eligió.

---

# 30. Modelo intermedio

No convertir un row directamente en `Transaction`.

```ts
type ImportedTransactionCandidate = {
  id: string;

  sourceRow?: number;
  sourcePage?: number;

  rawDescription: string;
  normalizedDescription: string;

  rawDate: string | number | null;
  occurredOn: string | null;

  rawAmount: unknown;
  amountMinor: number | null;
  currency: string | null;

  type: "expense" | "income" | "transfer" | "unknown";

  suggestedCategoryId: string | null;

  extractionConfidence: number;
  typeConfidence: number;
  categoryConfidence: number;

  duplicateStatus:
    | "none"
    | "exact"
    | "probable";

  issues: ImportIssue[];
};
```

---

## 31. Import Session

```ts
type ImportSession = {
  id: string;
  spaceId: string;

  status:
    | "selecting"
    | "parsing"
    | "review"
    | "committing"
    | "complete"
    | "failed";

  sourceType: "pdf" | "xls" | "xlsx" | "csv";

  candidates: ImportedTransactionCandidate[];

  statistics: {
    detected: number;
    ready: number;
    needsReview: number;
    duplicates: number;
  };
};
```

Puede ser estado local inicialmente.

No crear una tabla remota solo por anticipación.

---

# 32. Normalizar descripción

Entrada:

```text
PAGO TARJETA 1234 MERCADONA 0456 MADRID ES
```

Representación interna posible:

```text
mercadona
```

pero conservar una descripción útil para la revisión.

Pipeline:

1. lowercase
2. Unicode normalization
3. colapsar whitespace
4. remover referencias claramente técnicas
5. remover últimos dígitos de tarjeta cuando el patrón sea inequívoco
6. remover fechas embebidas inequívocas
7. remover IDs largos
8. conservar tokens de merchant

No borrar todos los números.

`7-ELEVEN` es un merchant válido.

---

## 33. Campos recomendados

Separar conceptos:

```text
sourceDescription
normalizedMerchant
displayTitle
```

No reemplazar permanentemente el texto del banco por una inferencia sin conservar trazabilidad suficiente.

---

# 34. Balance reconciliation

Cuando el documento incluya:

- opening balance
- closing balance
- running balance

validar:

```text
opening
+ credits
- debits
≈ closing
```

Tener en cuenta redondeo de la moneda.

Si no coincide:

**NO hacer auto-import.**

Copy:

> Encontramos una diferencia en este archivo. Revisa los movimientos antes de continuar.

---

# 35. Detectar filas que no son movimientos

Ignorar con reglas claras:

- header repetido
- footer
- subtotal
- saldo anterior
- saldo final
- página X de Y
- mensajes del banco
- datos legales
- publicidad
- account summary

Nunca asumir que toda fila con un número es una transacción.

---

# 36. Transferencias

Una transferencia entre cuentas propias no debe convertirse automáticamente en un gasto real.

Heurísticas:

- `transfer`
- `transferencia`
- `traspaso`
- mismo importe
- signo opuesto
- fechas cercanas
- referencias similares
- dos cuentas conocidas del usuario

Marcar:

```text
transfer_candidate
```

Si no se confirma:

requiere revisión.

No eliminarla automáticamente.

---

# 37. Categorización — orden recomendado

```text
1. Regla explícita del usuario
2. Merchant corregido previamente
3. Coincidencia exacta histórica
4. Coincidencia fuzzy histórica
5. Regla global conocida
6. Clasificador local
7. Clasificador remoto opcional
8. Sin categoría
```

La categoría debe elegirse entre las categorías reales del `activeSpace`.

No duplicar la lista de categorías en el importador.

---

# 38. Source of truth de categorías

Antes de implementar:

buscar el seed/servicio actual.

Si el usuario creó categorías como:

```text
Café
Trabajo
Perro
Piso nuevo
```

también deben ser candidatas.

El importador no debe limitarse a las categorías default originales.

---

# 39. Memoria personal de categorías

Ejemplo:

```text
MERCADONA 0134
```

juntoss sugiere `Compras`.

El usuario corrige a:

`Supermercado`.

Guardar la asociación:

```text
normalizedMerchant = mercadona
categoryId = supermercado
```

En futuras importaciones:

`MERCADONA MADRID`

→ `Supermercado` con confianza alta.

Esta memoria personalizada debe tener prioridad sobre reglas globales.

---

# 40. Tabla sugerida

```text
merchant_category_rules
```

Campos conceptuales:

```text
id
owner_user_id
space_id
normalized_merchant
merchant_pattern
category_id
source
confidence
created_at
updated_at
```

`source`:

```text
manual
import_correction
system
```

Aplicar RLS.

No crearla hasta revisar si ya existe una estructura equivalente.

---

# 41. No aprender patrones genéricos

No memorizar como merchants:

```text
PAGO
COMPRA
TARJETA
TRANSFERENCIA
OPERACION
```

Un merchant necesita tokens suficientemente distintivos.

---

# 42. Fuzzy matching

### Fuse.js

https://github.com/krisk/Fuse

Características actuales:

- TypeScript
- zero dependency
- fuzzy matching
- token search
- weighted fields
- mantenimiento activo

Puede comparar:

```text
normalizedMerchant
```

contra merchants históricos.

Ejemplo:

```text
mcdonalds madrid
mcdonald's
```

### Regla

Una coincidencia débil no debe crear una categoría automáticamente.

---

# 43. Reglas globales

Pueden existir patrones de alta confianza:

```text
netflix → Suscripciones
spotify → Suscripciones
uber → Transporte
mercadona → Supermercado
```

No convertir el proyecto en una base mundial de marcas.

Las reglas personales del usuario son más valiosas.

---

# 44. Referencia ML: smart_importer

Repositorio:

https://github.com/beancount/smart_importer

Licencia:

MIT.

Conceptos relevantes:

- entrena con transacciones históricas del usuario
- predice durante import
- correcciones alimentan futuras predicciones
- procesamiento local
- review
- SVC classifier

El proyecto advierte que datasets pequeños producen predicciones menos fiables.

### Recomendación

Adoptar el **feedback loop**, no necesariamente su implementación Python.

---

# 45. On-device ML futuro

Si reglas + historial dejan de ser suficientes:

## ONNX Runtime React Native

https://github.com/microsoft/onnxruntime

`onnxruntime-react-native`

- Microsoft
- MIT
- iOS/Android
- ONNX
- inferencia local
- soporte React Native actual

### Alternativa

`react-native-fast-tflite`

https://github.com/mrousavy/react-native-fast-tflite

- MIT
- activo
- TensorFlow Lite
- GPU/CoreML/Android delegates

No introducir un modelo ML en el MVP sin medir primero el valor de reglas + aprendizaje histórico.

---

# 46. LLM como último fallback

Puede recibir algo mínimo como:

```json
{
  "description": "PAGO TARJETA MERCADONA MADRID",
  "allowedCategoryIds": ["..."]
}
```

Nunca enviar por defecto:

- PDF completo
- balance
- IBAN
- número de cuenta
- nombre del usuario
- lista completa de transacciones

Output debe validarse contra IDs reales.

Un LLM no puede crear categorías silenciosamente.



---

# 47. Confidence

Cada candidato debe tener score separado.

Ejemplo conceptual:

```text
0.99 regla personal exacta
0.95 merchant histórico exacto
0.86 fuzzy histórico fuerte
0.82 regla global
0.68 clasificador
< threshold → revisar
```

Los thresholds definitivos deben calibrarse con fixtures y pruebas reales autorizadas.

No mostrar:

`confidence = 0.7142`

al usuario.

Mostrar simplemente:

- categoría
- `Revisar`
- `Sin categoría`

---

# 48. Dedupe — imprescindible

El usuario importará el mismo extracto más de una vez.

Prioridad:

1. transaction ID del banco
2. external reference estable
3. fingerprint normalizado
4. fuzzy duplicate como warning

Nunca usar solo el row number.

---

## 49. Fingerprint

Campos candidatos:

```text
space
source/account
occurredOn
amountMinor
currency
normalizedDescription
externalReference
```

Generar fingerprint estable.

### Librería investigada

`@noble/hashes`

https://www.npmjs.com/package/@noble/hashes

Características:

- MIT
- TypeScript
- SHA-256
- cero dependencias
- soporte React Native
- ampliamente utilizado

Instalar solo si el proyecto no tiene ya una utilidad segura equivalente.

---

## 50. Duplicados probables

Estos dos movimientos:

```text
2026-08-01 | Mercadona | -32.44
2026-08-02 | Mercadona | -32.44
```

no son necesariamente duplicados.

Regla:

```text
exact fingerprint → duplicate
similar transaction → review
```

Nunca eliminar automáticamente por fuzzy similarity.

---

# 51. Pantalla de review — obligatoria

Ejemplo:

```text
47 movimientos encontrados

38 listos
6 para revisar
3 ya existen
```

Los duplicados exactos aparecen deseleccionados.

Acciones:

- Revisar
- Importar
- Cancelar

---

## 52. Import row

Mostrar:

```text
icono de categoría
merchant/título
fecha
importe
categoría
```

Issues:

```text
⚠ Revisar fecha
⚠ Revisar categoría
⚠ Posible duplicado
```

No exponer detalles técnicos de parser.

---

## 53. Edición rápida

Reutilizar:

- `CategoryPicker`
- date picker actual
- selector expense/income
- input de título

Las correcciones deben actualizar el `ImportedTransactionCandidate`, no crear todavía el movimiento real.

---

# 54. Feedback loop

Cuando el usuario cambia categoría durante review:

1. guardar corrección
2. importar movimiento
3. aprender merchant rule si el merchant es estable
4. usarla en próximas importaciones

No aprender una asociación si:

- el merchant es demasiado genérico
- el usuario canceló
- la fila sigue ambigua
- la corrección no fue confirmada

---

# 55. Commit

Hacer commit por lote.

Preferir:

- Postgres RPC
- transacción
- idempotency key

Backend debe validar:

- usuario autenticado
- membresía del espacio
- categoría pertenece al espacio
- importe válido
- fecha válida
- currency
- fingerprint
- autoría

No confiar solo en el cliente.

---

## 56. Idempotencia

Si falla la red después de enviar 80 movimientos, reintentar no puede crear otros 80.

Usar:

```text
import_batch_id
import_fingerprint
```

y constraints adecuadas.

---

# 57. Modelo Transaction

No crear `ImportedTransaction` permanente si no hace falta.

Extender `Transaction` únicamente con metadata útil:

```text
source_type
import_batch_id
import_fingerprint
source_reference
```

No guardar por defecto:

- raw PDF
- raw Excel row
- OCR completo
- filename con datos sensibles

---

# 58. Active Space

El import pertenece al `activeSpace`.

Mostrar antes de seleccionar:

```text
Importar en: Personal
```

Si el usuario cambia el espacio durante el proceso:

- bloquear el cambio temporalmente
o
- cancelar y reiniciar import session

Nunca importar un estado personal en Pareja accidentalmente.

---

# 59. Actualización inmediata del Mapa

Después del commit exitoso:

1. actualizar/invalidate cache de movimientos
2. actualizar balance
3. actualizar categorías
4. actualizar Actividad
5. actualizar Inicio
6. actualizar Mapa

El Mapa debe usar:

```text
occurred_on
```

No ordenar por `created_at`.

Así un movimiento importado hoy con fecha de marzo aparece en marzo inmediatamente.

---

# 60. Real-time

“Tiempo real” aquí significa:

> tras confirmar la importación, la aplicación refleja inmediatamente los nuevos movimientos en todas las vistas.

No hace falta implementar sockets únicamente para una importación local.

En espacios compartidos, si Supabase Realtime ya forma parte de la arquitectura, las inserciones pueden propagarse al otro miembro mediante el mecanismo existente.

No construir un segundo realtime subsystem.

---

# 61. Moneda

Si el archivo contiene currency:

usar esa currency.

Si no:

- utilizar la del espacio cuando sea razonable
- pedir confirmación si existe ambigüedad

No convertir automáticamente divisas durante importación.

Si juntoss todavía no soporta multi-currency y un archivo mezcla monedas:

bloquear con explicación.

No convertir silenciosamente.

---

# 62. Seguridad de archivos

Validar:

- extension
- MIME
- header/magic cuando sea viable
- size
- pages
- rows

Rechazar:

- archivo corrupto
- ejecutable disfrazado
- macro-enabled no soportado
- contenido imposible de procesar
- zip bombs
- PDF Javascript/acciones no necesarias

El parser solo necesita leer datos.

No abrir links del PDF.

---

# 63. Datos temporales

Eliminar al finalizar:

- archivo temporal
- páginas renderizadas
- imágenes OCR
- raw OCR
- extractos intermedios

No enviar este contenido a:

- Sentry
- Crashlytics
- analytics
- console logs de producción

---

# 64. Errores de dominio

Definir códigos:

```text
unsupported_file
too_large
encrypted_pdf
wrong_pdf_password
corrupt_file
no_transactions_found
column_mapping_required
date_format_unknown
currency_unknown
balance_mismatch
partial_parse
too_many_ambiguous_rows
network_error
commit_failed
```

Mapear a copy humano.

---

## 65. Copy sugerido

### Entrada

**Importar movimientos**

Añade varios gastos e ingresos desde un archivo de tu banco.

### Picker

**Elige tu archivo**

Puedes importar Excel o CSV.

### Procesando

**Estamos ordenándolo todo**

Buscando fechas, importes y movimientos.

### Review

**Revisa antes de importar**

Hemos preparado tus movimientos. Confirma los que necesiten atención.

### Sin movimientos

**No encontramos movimientos**

Revisa que el archivo sea un extracto bancario con fechas e importes visibles.

### Parcial

**Necesitamos tu ayuda con este archivo**

Encontramos los movimientos, pero necesitamos confirmar algunos datos.

### Éxito

**Todo listo**

Tus movimientos ya están en juntoss.

---

# 66. No vender la tecnología

Evitar:

> Nuestra IA está analizando tu archivo.

Preferir:

> Estamos buscando tus movimientos.

El beneficio es importar fácilmente, no “usar IA”.

---

# 67. Import profiles por banco

Fase posterior:

```ts
type BankImportProfile = {
  signature: string;
  country?: string;
  institution?: string;
  format: string;
  mapping: ColumnMapping;
};
```

Usar headers y estructura para signature.

No identificar un banco únicamente por filename.

---

# 68. Firefly III Data Importer

Repositorio:

https://github.com/firefly-iii/data-importer

Investigación:

- importación CSV
- CAMT
- mappings
- rules
- APIs
- dedupe
- mantenimiento activo

Licencia:

AGPL-3.0.

### Uso

Muy buena referencia arquitectónica.

No copiar código sin revisar la obligación AGPL.

Repositorio de configuraciones por banco/país:

https://github.com/firefly-iii/import-configurations

Puede inspirar perfiles de importación.

---

# 69. Beancount Import

https://github.com/jbms/beancount-import

Características relevantes:

- fuentes enchufables
- matching
- reconciliation
- dedupe
- candidatos
- review
- predicción

Licencia:

GPL-2.0-only.

Usarlo como referencia conceptual, no copiar código sin revisión de licencia.

---

# 70. smart_importer

https://github.com/beancount/smart_importer

Licencia:

MIT.

Es una referencia muy útil para:

- aprendizaje a partir del historial
- correcciones del usuario
- clasificación local
- review antes de commit

---

# 71. Bank Statement Parser

https://github.com/sebastienrousseau/bankstatementparser

Licencia:

Apache-2.0.

Es el candidato open source más cercano al problema completo encontrado durante la investigación.

Debe formar parte del spike de backend.

---

# 72. Testing fixtures

Nunca subir estados bancarios reales al repo.

Crear datos ficticios:

```text
tests/fixtures/import/
├── excel/
│   ├── debit-credit-columns.xlsx
│   ├── signed-amount.xlsx
│   ├── european-dates.xlsx
│   └── ambiguous-dates.xlsx
├── csv/
├── pdf/
│   ├── digital-table.pdf
│   ├── digital-lines.pdf
│   ├── scanned-statement.pdf
│   └── encrypted.pdf
└── expected/
```

Todo ficticio.

---

# 73. Tests de fechas

Cubrir:

- DD/MM/YYYY
- MM/DD/YYYY
- YYYY-MM-DD
- serial Excel
- leap year
- cambio de año
- timezone
- fecha valor vs operación
- fecha ambigua

---

# 74. Tests de dinero

Cubrir:

- `1.234,56`
- `1,234.56`
- negativos
- paréntesis
- cargo/abono
- debit/credit
- símbolos
- trailing minus
- importe cero
- cantidades grandes

---

# 75. Tests de categorización

- merchant exacto
- user override
- fuzzy fuerte
- fuzzy débil
- merchant nuevo
- categoría custom
- categoría archivada
- sin categoría
- categorías diferentes según space

---

# 76. Tests dedupe

- mismo archivo dos veces
- extractos solapados
- dos compras reales iguales
- transaction ID
- fingerprint
- probable duplicate

---

# 77. Tests PDF

- digital
- scanned
- hybrid
- corrupto
- password
- varias páginas
- header repetido
- subtotal
- saldo final
- tabla con varias columnas

---

# 78. Golden tests

Cada fixture debe tener salida esperada:

```text
input
→ expected normalized candidates
```

Comparar:

- occurredOn
- amountMinor
- currency
- type
- description
- duplicate
- expected category/range de confidence

No probar solo `rows.length`.

---

# 79. Métricas técnicas

En datasets de prueba/autorizados medir:

- date accuracy
- amount accuracy
- expense/income accuracy
- category acceptance rate
- duplicates precision
- duplicates recall
- detected transactions
- missed transactions
- parse duration

Importe/fecha/tipo deben tener estándares muy altos antes de auto-import.

La categoría puede requerir review.

---

# 80. Observabilidad segura

Permitido:

```text
importSessionId
fileType
pageCount
rowCount
duration
parserUsed
errorCode
```

No permitido:

```text
amount
merchant
balance
IBAN
account number
raw description
OCR text
```

---

# 81. Fases de implementación recomendadas

## Fase 1 — Excel + CSV

Implementar:

- picker
- XLS/XLSX
- CSV
- mappings
- fecha
- importe
- type
- moneda
- categoría
- dedupe
- review
- batch commit

Esta fase puede ofrecer mucha precisión.

## Fase 2 — PDF digital

Comparar mediante spike:

- `expo-pdf-text-extract`
- backend `pdf-parse`
- `bankstatementparser`

Usar al menos 20 layouts ficticios/reales autorizados.

Medir:

- precisión
- orden
- tables
- time
- memory
- Android
- iOS

## Fase 3 — PDF scanned

- detect scanned
- OCR
- page provenance
- review reforzado

## Fase 4 — category learning

- merchant normalization
- personal rules
- fuzzy matching
- feedback loop

## Fase 5 — ML local

Solo si existen datos suficientes y un beneficio medible.

## Fase 6 — formatos bancarios estructurados

- OFX
- QFX
- CAMT
- MT940

---

# 82. Dependencias: decisión recomendada

| Herramienta | Uso | Licencia | Estado |
|---|---|---|---|
| `@react-native-documents/picker` | seleccionar archivos | MIT | Recomendada |
| SheetJS CE | XLS/XLSX | Apache-2.0 | Recomendada |
| `expo-pdf-text-extract` | PDF digital on-device | MIT | Spike obligatorio |
| `pdf-parse` | PDF digital backend | Apache-2.0 | Buen candidato |
| `bankstatementparser` | parser backend completo | Apache-2.0 | Candidato fuerte |
| Fuse.js | fuzzy merchant | verificar al instalar | Recomendada si hace falta |
| `@noble/hashes` | fingerprint SHA-256 | MIT | Solo si no existe equivalente |
| ONNX Runtime | ML on-device | MIT | Fase futura |
| `react-native-fast-tflite` | ML on-device | MIT | Alternativa futura |
| Firefly III importer | referencia | AGPL-3.0 | No copiar sin review |
| beancount-import | referencia | GPL-2.0-only | No copiar sin review |
| smart_importer | referencia ML | MIT | Concepto recomendado |

Verificar nuevamente versión y licencia antes de instalar.

---

# 83. Agent Implementation Plan — obligatorio

Antes de tocar código, el agente debe devolver:

```md
## Import feature implementation plan

### Existing components to reuse
- ...

### Existing transaction creation path
- ...

### Category source of truth
- ...

### Existing storage/repository
- ...

### Existing dependencies
- ...

### New dependencies proposed
- ...

### Why each dependency is necessary
- ...

### Platform differences
#### iOS
- ...

#### Android
- ...

### Privacy impact
- ...

### Database impact
- ...

### Tests
- ...
```

No iniciar una reestructuración general del proyecto.

---

# 84. Reglas para agentes durante la implementación

- No duplicar componentes.
- No reescribir creación de movimientos.
- No crear nueva category source of truth.
- No inventar schemas de Supabase sin revisar `DATABASE.md`.
- No instalar librerías sin comparar alternativas.
- No hacer refactors no solicitados.
- No implementar OCR antes de terminar el parser estructurado.
- No almacenar raw bank statements.
- No enviar datos financieros a IA sin aprobación.
- No usar `any`.
- No ocultar parser failures.
- No declarar “works” sin pruebas Android+iOS.

---

# 85. Definition of Done — Excel/CSV

- [ ] picker funciona iOS
- [ ] picker funciona Android
- [ ] tipo/tamaño validados
- [ ] workbook parseado
- [ ] sheet detectada
- [ ] headers detectados
- [ ] mapping manual disponible
- [ ] fechas normalizadas
- [ ] importes normalizados
- [ ] expense/income
- [ ] currency
- [ ] category suggestions
- [ ] personal rules
- [ ] duplicates
- [ ] preview
- [ ] edición
- [ ] batch commit idempotente
- [ ] Home actualiza
- [ ] Activity actualiza
- [ ] Map actualiza
- [ ] tests
- [ ] privacy inventory actualizado
- [ ] open source notices actualizados

---

# 86. Definition of Done — PDF

Además:

- [ ] digital/scanned detection
- [ ] extraction por página
- [ ] OCR fallback
- [ ] password protected
- [ ] password no persistido
- [ ] repeated headers
- [ ] page provenance
- [ ] balance reconciliation cuando exista
- [ ] temporary cleanup
- [ ] no raw content en logs
- [ ] fixture coverage
- [ ] rendimiento aceptable iOS
- [ ] rendimiento aceptable Android

---

# 87. Decisión clave

No perseguir “100% automático” desde la primera versión.

La experiencia correcta es:

```text
juntoss hace casi todo
→ el usuario corrige únicamente excepciones
→ juntoss aprende
→ la siguiente importación necesita menos correcciones
```

Esto es más fiable, más privado y puede mejorar de manera personal para cada usuario.

---

# 88. Regla final

> **Automatizar lo seguro. Sugerir lo probable. Preguntar lo ambiguo. Nunca inventar.**

La feature se considera exitosa cuando un usuario puede importar un extracto, revisar unas pocas excepciones y ver inmediatamente sus movimientos correctamente colocados en el Mapa.

---

# 89. Fuentes principales consultadas

## React Native Documents
https://react-native-documents.github.io/docs/

https://github.com/react-native-documents/document-picker

## SheetJS
https://docs.sheetjs.com/docs/demos/mobile/reactnative/

https://docs.sheetjs.com/docs/miscellany/license/

## PDF
https://github.com/gr8pathik/expo-pdf-text-extract

https://github.com/mehmet-kozan/pdf-parse

https://github.com/mozilla/pdf.js

## Apple Vision
https://developer.apple.com/documentation/vision/recognizetextrequest

https://developer.apple.com/documentation/vision/recognizedocumentsrequest

https://developer.apple.com/documentation/vision/recognize-tables-within-a-document

## Google ML Kit
https://developers.google.com/ml-kit/vision/text-recognition/v2/android

https://developers.google.com/ml-kit/vision/doc-scanner/android

## Open source bank import
https://github.com/sebastienrousseau/bankstatementparser

https://github.com/firefly-iii/data-importer

https://github.com/firefly-iii/import-configurations

https://github.com/jbms/beancount-import

https://github.com/beancount/smart_importer

## On-device ML
https://github.com/microsoft/onnxruntime

https://github.com/mrousavy/react-native-fast-tflite

## Matching / hashing
https://github.com/krisk/Fuse

https://www.npmjs.com/package/@noble/hashes

## Supabase
https://supabase.com/docs/guides/functions/limits
