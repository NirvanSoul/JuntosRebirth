# Juntoss — Plan de implementación Venezuela

## UX monetaria especial para usuarios de Venezuela

> Objetivo: incorporar una experiencia de introducción, visualización y análisis de USD/VES para usuarios de Venezuela, sin introducir complejidad innecesaria para el resto de usuarios.

> **Revisión de producto — 2026-09-05.** Esta sección es la fuente de
> verdad para el modelo Venezuela y sustituye cualquier apartado posterior
> de este documento que hable de cuentas multimoneda, de agregar USD y VES
> como saldos independientes, o de permitir países diferentes dentro de un
> espacio compartido. La Entrega A y la parte autónoma de la Entrega B ya se
> iniciaron en frontend; el contrato remoto de `0A` sigue siendo bloqueante
> para balances, agregados y espacios compartidos.

---

# 0. Decisiones de producto vinculantes

## 0.1 Una moneda contable, tres modos de lectura

Una persona cuyo `countryCode` sea `VE` trabaja con una única moneda contable
principal: **USD**. No es una opción del usuario ni una segunda divisa que se
pueda añadir a una cuenta. La razón es evitar balances ambiguos y el modelo de
"sumar divisas" que rompería cuentas, categorías y espacios.

El importe de un movimiento sí puede introducirse en una de estas dos monedas:

```text
USD  → entrada normal y recomendada
VES  → entrada excepcional, por ejemplo cuando el recibo está en bolívares
```

Después de guardarlo, el servidor conserva el importe original y su snapshot,
pero produce también el valor contable USD necesario para balances y agregados.
Por tanto, el usuario puede registrar `Bs. 5.000`, sin que eso cree un segundo
saldo VES en su cuenta.

La interfaz ofrece tres **modos de visualización**, que no son tres monedas
activas ni tres balances distintos:

| Modo      | Qué se muestra           | Fuente                                                              |
| --------- | ------------------------ | ------------------------------------------------------------------- |
| `USD`     | Valor principal/contable | USD original o USD normalizado al guardar                           |
| `VES_BCV` | Equivalente en bolívares | Snapshot BCV del movimiento; tasa actual solo para un saldo actual  |
| `EUR`     | Equivalente USD a tasa EUR/BCV | Snapshot EURO del movimiento; tasa actual solo para un saldo actual |

`EUR` identifica la referencia oficial EUR/VES del BCV aplicada a un importe
en USD; no representa una conversión a euros europeos. El modal muestra esa
referencia como "Tasa EUR" para que nunca se confunda con una moneda de salida.

## 0.2 Regla de cuentas y balances VE

- Toda cuenta financiera de un usuario VE tiene un único saldo: `USD`.
- La creación y edición de cuentas VE no ofrece selector multimoneda.
- Un movimiento VES asignado a una cuenta VE impacta ese saldo mediante su
  equivalente USD congelado por el backend. El movimiento continúa mostrando
  su importe original VES en el detalle.
- Una cuenta existente con más de una moneda no se debe reinterpretar al
  cambiar un perfil a `VE`. El cambio de país se bloquea y se explica la
  condición hasta que exista una migración explícita y aprobada.
- Los usuarios que no son VE conservan sin cambios el modelo multimoneda
  actual.

## 0.3 Selector correcto: modo de visualización, no "tasa preferida"

Para VE, el control junto al input de importe sigue el patrón existente de
selector de moneda, pero solo alterna la **moneda de entrada**:

```text
[ 10,00 ] [ $ USD / Bs. VES ]
```

En balances, ingresos, gastos, detalle de categoría, detalle de cuenta y
detalle de movimiento se usa un segundo control reutilizable:

```text
Ver en:  USD | Bs. BCV | EUR
```

No se llama `RateSourceSelector` en esta experiencia, porque BCV/EURO no son
una preferencia que cambie el saldo; son modos de presentar una misma realidad
contable. El selector debe iniciar en USD y recordar la última elección solo
como preferencia visual local del usuario.

## 0.4 Previews al introducir un importe

El preview siempre parte de la moneda introducida:

```text
Entrada USD:  $10,00
               ≈ Bs. 500,00 · BCV
               ≈ Bs. 550,00 · Tasa EUR

Entrada VES:  Bs. 5.000,00
               ≈ $100,00 · BCV
               ≈ $90,91 · Tasa EUR
```

No se muestra un selector de modo dentro del preview. Las dos equivalencias se
presentan debajo del importe principal, de forma secundaria. El servidor es la
única autoridad de los cálculos, el redondeo y las tasas.

## 0.5 Regla de espacios compartidos

Un espacio compartido solo puede tener miembros cuyo `countryCode` coincida.
No hay excepciones para VE: la regla protege coherencia de moneda, snapshots y
capacidades del espacio para todos los países.

- El backend valida la regla al aceptar una invitación y al añadir miembros por
  cualquier ruta equivalente. El frontend nunca es la única barrera.
- Si los países no coinciden, el backend responde `409`
  `SPACE_COUNTRY_MISMATCH` y no crea la membresía ni consume la invitación.
- La respuesta puede devolver `requiredCountryCode` para explicar la regla,
  pero no debe exponer más datos de perfil de la otra persona de los necesarios.
- El cliente muestra un modal, no un error genérico:

  ```text
  No pueden compartir este espacio todavía

  Para compartir un espacio, ambos deben tener el mismo país configurado.
  Puedes revisar tu país en Ajustes > País y moneda. La otra persona también
  debe comprobar el suyo antes de volver a intentar la invitación.

  [Ir a ajustes] [Entendido]
  ```

- El botón `Ir a ajustes` lleva a la pantalla correspondiente; nunca cambia
  el país de forma automática ni altera datos financieros.
- Cambiar el país mientras se pertenece a un espacio compartido activo se
  bloquea inicialmente con `COUNTRY_CHANGE_BLOCKED_BY_SHARED_SPACE`. La salida
  segura de la primera versión es abandonar/disolver ese espacio, ajustar el
  país y volver a crear o aceptar una invitación. Una migración coordinada de
  país para todos los miembros es una futura funcionalidad, no un efecto
  lateral del ajuste.

## 0.6 Consecuencia para lo ya explorado

La interfaz experimental que permite múltiples monedas en cuentas o suma
snapshots por moneda no cumple este contrato final para VE. Antes de lanzar
esta fase se debe reemplazar por el modelo de valor USD canónico y los tres
modos de lectura de esta sección. El resto de usuarios no debe sufrir ninguna
regresión.

---

# 0A. Contrato requerido del backend

El backend necesita una ampliación deliberada; no basta con los endpoints de
preview actuales.

## 0A.1 Perfil y capacidades

Para `countryCode: 'VE'`, el backend debe declarar o imponer:

```ts
{
  canonicalCurrency: 'USD',
  allowedTransactionInputCurrencies: ['USD', 'VES'],
  allowsMultipleAccountCurrencies: false,
  displayModes: ['USD', 'VES_BCV', 'EUR']
}
```

Puede vivir dentro de `GET /v1/me` o de un endpoint de capacidades, pero debe
ser una respuesta del servidor y no una inferencia repartida en componentes.
Al pasar a VE, `defaultCurrency` futuro debe ser USD. El servidor rechaza una
combinación VE + moneda principal distinta de USD con un error explícito, o
expone una migración atómica aprobada; nunca la corrige silenciosamente.

## 0A.2 Movimiento, snapshot y valor contable

Al crear/sincronizar un movimiento VE, el servidor recibe solamente:

```ts
{
  amountMinor: string,
  inputCurrency: 'USD' | 'VES',
  customRateId?: string | null
}
```

Y devuelve/persiste, como mínimo:

```ts
{
  amountMinor: string,                 // importe original
  currency: 'USD' | 'VES',             // moneda original
  accountingAmountMinorUsd: string,    // valor USD que impacta el balance
  exchangeSnapshot: {
    countryCode: 'VE',
    createdWithCurrency: 'USD' | 'VES',
    rates: {
      BCV?: {
        baseCurrency, quoteCurrency, rate,
        convertedAmountMinor, convertedCurrency, observedAt
      },
      EURO?: {
        baseCurrency, quoteCurrency, rate,
        convertedAmountMinor, convertedCurrency, observedAt
      },
      CUSTOM?: {
        baseCurrency, quoteCurrency, rate,
        convertedAmountMinor, convertedCurrency, observedAt
      }
    }
  }
}
```

`accountingAmountMinorUsd` debe ser exacto, entero en unidades menores y
congelado. Para una entrada VES se obtiene de BCV al guardar. Para una entrada
USD coincide con el importe USD original. No se recalcula al abrir un balance.

`convertedAmountMinor` **no es interpretable sin `convertedCurrency`**. Cada
snapshot debe declarar explícitamente la moneda de ese importe, aunque coincida
con `quoteCurrency` en el caso habitual USD → VES. Para una entrada VES, el
modo USD usa `accountingAmountMinorUsd`; el modo `VES_BCV` conserva el importe
original VES; y el modo EUR requiere una conversión congelada cuyo
`convertedCurrency` sea `EUR`. El cliente nunca deduce la dirección de la
conversión a partir de `baseCurrency` y `quoteCurrency`, ni recalcula con la
tasa guardada.

Las rutas directas, `POST /v1/spaces/:spaceId/sync` y `GET /v1/sync/snapshot`
deben serializar el mismo contrato. El servidor sigue rechazando snapshots o
tasas propuestas por el cliente.

## 0A.3 Cuentas y agregados

Para una cuenta VE, el backend solo acepta/crea la configuración `USD`. Debe
rechazar intentos de añadir VES o cualquier segunda moneda con
`VE_ACCOUNT_MULTI_CURRENCY_NOT_ALLOWED`.

Los endpoints de saldo, ingresos, gastos, categoría y cuenta necesitan aceptar
un modo de lectura o devolver un bloque de valores ya resueltos:

```ts
type VenezuelaValuation = {
  mode: 'USD' | 'VES_BCV' | 'EUR';
  currency: 'USD' | 'VES' | 'EUR';
  incomeMinor: string;
  expenseMinor: string;
  balanceMinor?: string;
  snapshotCoverage: { valued: number; missing: number };
};
```

El agregado servidor es la referencia cuando se consulta un conjunto remoto o
paginado. La app offline puede mostrar un agregado local solo a partir de todos
los snapshots disponibles, con cobertura visible; jamás usa la tasa de hoy para
rellenar movimientos antiguos.

Para el modo USD de una cuenta, `balanceMinor` procede siempre del ledger USD.
Para `VES_BCV` y `EUR`, un saldo actual es una equivalencia a tasa vigente,
marcada como tal; los listados y los totales de movimientos usan snapshots
históricos. No presentar una suma histórica como si fuera el saldo bancario
actual.

## 0A.4 Espacios e invitaciones

El backend debe guardar el país del espacio compartido al crear el primer
miembro (o derivarlo de miembros, pero con una única regla de igualdad) y
validar país en:

1. creación de invitación cuando el destinatario ya se pueda identificar;
2. aceptación de invitación — obligatoria;
3. cualquier alta de miembro alternativa;
4. actualización de `countryCode` de un miembro activo.

Contrato de error mínimo:

```json
{
  "error": {
    "code": "SPACE_COUNTRY_MISMATCH",
    "message": "Los miembros de un espacio compartido deben tener el mismo país.",
    "requiredCountryCode": "VE"
  }
}
```

No cambiar membresías existentes, movimientos ni país como respuesta a un
error. La operación debe ser atómica: falla el intento completo.

## 0A.5 Migración y compatibilidad

- Ningún perfil existente se convierte automáticamente a VE.
- Al solicitar el cambio a VE, el backend valida antes que no haya cuentas
  multimoneda ni membresías compartidas incompatibles. Si las hay, responde un
  código de bloqueo y datos mínimos para que el frontend explique el siguiente
  paso.
- Los movimientos históricos USD/VES sin `accountingAmountMinorUsd` requieren
  una migración explícita, auditable y reversible antes de activar balances VE.
  Si no se puede calcular con certeza, se marca la cobertura incompleta: nunca
  se inventa un valor usando la tasa actual.

---

# 0B. Plan de frontend por entregas

## Entrega A — Contrato y guardas

- Acordar los campos y errores de `0A` con el backend.
- Añadir capacidades centralizadas, sin condicionales `country === 'VE'`
  dispersos.
- [x] Bloquear selector multimoneda al crear cuentas VE: su único saldo nace
  en USD. La validación remota de una cuenta existente o un cambio de país
  sigue pendiente del backend.
- Añadir pruebas de no regresión para cuentas multimoneda de países no VE.

## Entrega B — Registro de movimiento

- [x] Sustituir el selector genérico por `VenezuelaInputCurrencySelector` en
  VE: USD/VES y nada más.
- [x] Mantener USD como selección inicial.
- [x] Mostrar los previews BCV y Euro bajo el importe, con debounce y estados
  loading/error sin bloquear la escritura.
- Enviar la moneda original y nunca una tasa calculada en cliente.

## Entrega C — Lectura y análisis

- [ ] Integrar `VenezuelaDisplayModeSelector` (`USD`, `Bs. BCV`, `EUR`) en el
  detalle individual con el contrato de snapshot completo. El componente y el
  fallback seguro ya existen, pero falta que el backend entregue
  `convertedCurrency` y `accountingAmountMinorUsd`.
- Integrarlo en los resúmenes de ingresos, gastos, balance, categoría y
  cuenta, sin modificar el monto original almacenado.
- El detalle de movimiento enseña original + el modo elegido + origen y fecha
  del snapshot; los movimientos legacy comunican cobertura no disponible.
- Diferenciar visualmente "equivalencia histórica de movimientos" de
  "equivalencia actual de saldo".

## Entrega D — Espacios compartidos

- [x] Mapear `SPACE_COUNTRY_MISMATCH` al modal de explicación y navegación a
  Ajustes > País y moneda, tanto desde la invitación dentro de la app como
  desde un enlace de invitación.
- Deshabilitar/reintentar de forma segura la aceptación sin consumir la
  invitación.
- Mapear `COUNTRY_CHANGE_BLOCKED_BY_SHARED_SPACE` al flujo de explicación,
  sin cambiar datos locales hasta confirmación del servidor.

## Entrega E — Persistencia, offline y migración

- Persistir `accountingAmountMinorUsd` y snapshots en SQLite y en restauración
  offline.
- No mostrar un balance VE definitivo si falta el valor contable de algún
  movimiento relevante; mostrar cobertura y estado de sincronización.
- Definir y probar la migración de datos históricos con el backend antes de
  habilitar el cambio de país hacia VE en producción.

## Criterios de aceptación nuevos

- Un usuario VE nunca obtiene una cuenta con más de un saldo/moneda.
- USD es siempre el valor contable principal de VE.
- VES es una moneda de entrada/origen, no un saldo paralelo.
- Un cambio de visualización no cambia importes guardados, balances contables
  ni snapshots.
- Un movimiento en VES impacta una cuenta VE en USD con el valor que congeló
  el servidor.
- Un espacio compartido no admite miembros de países diferentes por ninguna
  ruta de API.
- El error de país se entiende y permite llegar a Ajustes, sin revelar más
  datos de la otra persona ni perder la invitación.
- Usuarios no VE conservan por completo el comportamiento multimoneda actual.

---

# 1. Principio general

El frontend no debe decidir reglas monetarias por su cuenta.

Debe recibir del backend:

```text
countryCode
capabilities
tasas
conversiones
snapshots históricos
```

El frontend se encarga principalmente de:

```text
interacción
presentación
preferencias visuales
estado local
```

---

# 2. Feature capability

Al cargar sesión:

```http
GET /me/capabilities
```

Mantener en store:

```ts
userCapabilities = {
  countryCode: 'VE',
  venezuelaCurrencyMode: true,
  customExchangeRate: true,
  multiRateMovementDisplay: true,
};
```

No repetir:

```ts
if (country === "VE")
```

en todos los componentes.

Crear helper:

```ts
useCurrencyCapabilities();
```

---

# 3. Onboarding

Añadir pantalla/campo:

```text
¿En qué país vives?
```

Guardar:

```text
Venezuela
España
...
```

Debe quedar claro que esto configura:

```text
moneda
tasas
funcionalidades locales
```

No solicitar GPS.

---

# 4. Ajustes

Crear sección:

```text
País y moneda
```

Permitir modificar país.

Al cambiar desde:

```text
Venezuela → España
```

no borrar datos ni modificar movimientos existentes.

Solo cambia:

```text
capacidades del usuario
preferencias futuras
UI disponible
```

---

# 5. Modal “Agregar movimiento”

Para usuario VE, rediseñar la zona de importe.

Estado principal:

```text
[ 10,00 ] [ USD ▼ ]
```

Al pulsar:

```text
USD
```

selector:

```text
Dólares
Bolívares
```

No mostrar opciones innecesarias.

---

# 6. Selector de moneda

Componente reutilizable:

```tsx
<VenezuelaCurrencySelector />
```

Estados:

```ts
'USD';
'VES';
```

Labels:

```text
Dólares
Bolívares
```

Símbolos:

```text
$
Bs.
```

---

# 7. Conversión en vivo

Mientras el usuario escribe:

```text
Bs. 10.000
```

mostrar debajo:

```text
≈ $190,99 a tasa BCV
```

o si escribe:

```text
$10
```

mostrar:

```text
≈ Bs. 523,46
```

---

# 8. Debounce

No consultar backend en cada tecla.

Usar:

```text
300–500 ms
```

de debounce.

No lanzar request:

```text
si monto vacío
si monto = 0
si input inválido
```

---

# 9. Estado de preview

Crear hook:

```ts
useExchangePreview({
  amount,
  currency,
});
```

Estados:

```ts
idle;
loading;
success;
stale;
error;
```

---

# 10. Visualización de tasa viva

> Contrato de frescura (ver sección 59): la tasa que devuelve el backend es
> fija para todo el día de Venezuela, no "en vivo" en sentido literal. No
> mostrar textos que sugieran actualización en tiempo real (ej. spinners
> repetidos, "actualizando…" constante).

La conversión debajo del input debe incluir:

```text
tasa usada
última actualización
```

Ejemplo compacto:

```text
≈ $190,99 · BCV
```

Al pulsar información:

```text
Tasa BCV actualizada hoy a las 14:00
```

---

# 11. Selector de tasa

La conversión secundaria puede permitir:

```text
BCV
Euro
Personalizada
```

Componente:

```tsx
<RateSourceSelector />
```

No mezclar esto con selector de moneda.

Son conceptos diferentes:

```text
Moneda introducida → USD/VES
Tasa de referencia → BCV/EURO/CUSTOM
```

---

# 12. Modal de tasa personalizada

Crear nuevo modal:

```text
Tasa personalizada
```

Campos:

```text
Nombre opcional
1 USD = [____] Bs.
```

CTA:

```text
Guardar tasa
```

Ejemplo:

```text
Mi tasa
1 USD = 54,50 Bs.
```

---

# 13. Estado de tasa personalizada

Si no existe:

```text
Personalizada
+ Crear tasa
```

Si existe:

```text
Personalizada
54,50 Bs./USD
Editar
```

---

# 14. Guardar movimiento

Al pulsar guardar, frontend envía:

```text
amount
currency
rateSourcePreference
customRateId, si aplica
```

No debe enviar:

```text
BCV histórico arbitrario
```

El backend congela la tasa.

---

# 15. Loading al guardar

Como guardar ahora puede implicar snapshot de tasas:

- bloquear doble submit;
- mostrar spinner en CTA;
- preservar input si hay error;
- usar mutation id/idempotencia.

---

# 16. Error de tasas

Si preview falla:

```text
No pudimos actualizar la conversión.
Puedes guardar el movimiento igualmente si el backend lo permite.
```

Si backend exige tasa y no puede obtenerla:

```text
No se pudo obtener una tasa válida. Inténtalo de nuevo.
```

Nunca mostrar:

```text
$0
Bs. 0
```

por error.

---

# 17. Movimiento creado en VES

Preview card recomendada:

```text
Supermercado

Bs. 10.000
≈ $190,99

BCV
```

La cantidad original siempre debe ser visualmente principal.

---

# 18. Movimiento creado en USD

Preview:

```text
Restaurante

$10,00
≈ Bs. 523,46

BCV
```

---

# 19. Jerarquía visual

Regla:

```text
Monto original = principal
Conversión = secundaria
Fuente de tasa = terciaria
```

No invertirla.

---

# 20. Detalle de movimiento

Debe mostrar claramente:

```text
Monto original
Equivalente BCV
Equivalente Euro
Equivalente personalizado
Fecha de la tasa
```

Ejemplo:

```text
Monto
Bs. 10.000

Equivalencias del día
BCV       $190,99
Euro      €163,30
Mi tasa   $183,49
```

---

# 21. Snapshot histórico

Añadir label:

```text
Tasas del día del movimiento
```

o:

```text
Conversión histórica
```

Evitar hacer pensar que se está usando la tasa de hoy.

---

# 22. Movimiento legacy

Si no existe snapshot:

```text
Bs. 10.000
Conversión histórica no disponible
```

No calcular silenciosamente con la tasa actual.

---

# 23. Preview cards reutilizables

Crear una capa común:

```tsx
<MoneyAmount />
<ConvertedMoneyAmount />
<RateBadge />
```

Ejemplo:

```tsx
<MoneyAmount value="10000" currency="VES" />
```

---

# 24. Formateo monetario

Centralizar:

```ts
formatMoney();
formatExchangeRate();
```

Ejemplos:

```text
Bs. 10.000,00
$190,99
€163,30
```

Respetar locale del usuario cuando corresponda.

---

# 25. No duplicar lógica

Evitar cálculos de:

```text
amount / rate
amount * rate
```

directamente dentro de cards.

El frontend puede hacer preview visual optimista si existe una tasa recibida, pero la respuesta backend es la referencia final.

---

# 26. Detalle de categoría

Añadir selector:

```text
Ver en:
BCV
Euro
Personalizada
```

Ejemplo:

```text
Comida
Este mes

$420,32
Tasa BCV histórica
```

---

# 27. Agregados históricos

El frontend no debe sumar conversiones por su cuenta.

Backend debe devolver:

```text
total
currency
rateSource
```

El frontend solo presenta.

---

# 28. Lista de movimientos dentro de categoría

Cada card debe poder mostrar:

```text
original
convertido según selector actual
```

Ejemplo selector:

```text
BCV
```

Cards:

```text
Bs. 5.000   ≈ $100
Bs. 6.000   ≈ $100
```

---

# 29. Cambio de tasa en categoría

Cuando usuario cambia:

```text
BCV → Euro
```

refetch del resumen.

La lista puede:

- venir ya enriquecida;
- o refetchearse si backend genera la conversión.

Preferir consistencia backend.

---

# 30. Preview card de categoría

Ejemplo:

```text
Comida
$420,32
BCV
```

Si la categoría contiene múltiples monedas, mostrar:

```text
Valor equivalente
```

No fingir que existe un único monto nominal homogéneo.

---

# 31. Detalle de cuenta VES

Header:

```text
Banco
Bs. 100.000

≈ $1.910
BCV actual
```

Importante:

```text
saldo actual → tasa actual
movimientos → snapshots históricos
```

---

# 32. Cuenta USD

Header:

```text
Cuenta USD
$500

≈ Bs. 26.170
BCV actual
```

---

# 33. Preview card de cuenta

Para cuenta VES:

```text
Mercantil
Bs. 100.000
≈ $1.910
```

Para cuenta USD:

```text
Efectivo
$50
≈ Bs. 2.617
```

---

# 34. Selector de tasa global en cuenta

En detalle de cuenta:

```text
BCV
Euro
Personalizada
```

Solo cambia equivalencia secundaria.

Nunca cambia:

```text
saldo nominal
```

---

# 35. Espacios compartidos

Un espacio no debe imponer la tasa visual de un miembro a otro.

Guardar preferencia en store por usuario:

```ts
preferredVenezuelaRateSource;
```

Ejemplo:

```text
Usuario A → BCV
Usuario B → Euro
```

Ambos ven el mismo movimiento, con diferente equivalencia secundaria.

---

# 36. Movimiento creado por otro usuario

Si usuario B no es de Venezuela pero recibe un movimiento:

```text
Bs. 10.000
```

debe poder visualizarlo.

No ocultar el monto original.

Puede mostrarse sin las herramientas avanzadas de edición si sus capabilities no las incluyen.

---

# 37. Preferencia global

En ajustes Venezuela:

```text
Tasa de referencia predeterminada

○ BCV
○ Euro
○ Personalizada
```

Aplicar a:

```text
preview cards
categorías
cuentas
detalle de movimiento como selección inicial
```

---

# 38. Store

Ejemplo:

```ts
currencyPreferences = {
  countryCode: 'VE',
  preferredRateSource: 'BCV',
  customRateId: null,
};
```

No guardar tasas oficiales como estado persistente indefinido.

Las tasas expiran.

---

# 39. Cache frontend

Puede cachearse:

```text
preview rates
```

con React Query/TanStack Query.

Configurar:

```text
staleTime corto
```

Ejemplo:

```text
5 minutos
```

---

# 40. Actualización de tasa

Si cambia mientras el usuario tiene modal abierto:

- no resetear input;
- refrescar preview;
- mostrar actualización discretamente.

Caso concreto por el contrato de frescura (sección 59): si la app queda
abierta cruzando la medianoche hora Venezuela, la tasa del día cambia sin
que el usuario haga nada. Debe tratarse igual que cualquier otra
actualización de tasa: refrescar preview, no resetear input. No hace falta
que el frontend calcule el corte de día — el backend ya devuelve la tasa
correcta para el momento en que se pide; basta con no cachear la respuesta
más allá del `staleTime` normal (sección 39) para no arrastrar la tasa del
día anterior tras el cambio de fecha.

---

# 41. Navegación

Pantallas afectadas:

```text
Onboarding
Ajustes
Agregar movimiento
Editar movimiento
Detalle de movimiento
Lista de movimientos
Preview movimiento
Detalle categoría
Preview categoría
Detalle cuenta
Preview cuenta
Espacios compartidos
```

---

# 42. Editar movimiento

Definir producto claramente.

Recomendación:

Si cambia:

```text
monto
moneda
fecha
```

crear un nuevo snapshot.

Si solo cambia:

```text
nota
categoría
descripción
```

conservar snapshot original.

---

# 43. Cambio de fecha

Caso importante:

Usuario cambia movimiento:

```text
1 septiembre → 10 agosto
```

Decidir si tasa corresponde:

```text
a fecha histórica real
```

Recomendación backend/producto:

- si proveedor soporta histórico, obtener tasa del día seleccionado;
- si no, marcar que snapshot corresponde al momento de edición.

El frontend debe mostrar el resultado que backend determine.

---

# 44. UI de tasas

Evitar mostrar demasiados datos simultáneos en cards.

Cards:

```text
1 monto principal
1 monto secundario
1 badge de tasa
```

Los tres valores completos:

```text
BCV
Euro
Custom
```

solo en pantalla de detalle.

---

# 45. Accesibilidad

No identificar tasa únicamente por color.

Usar texto:

```text
BCV
Euro
Personalizada
```

Botones con hitbox suficiente.

---

# 46. Skeletons

Añadir skeleton específico para:

```text
conversión en vivo
totales de categoría
equivalencia de cuenta
```

No bloquear toda la pantalla si solo falta la conversión.

---

# 47. Estados offline

Si el usuario está offline:

```text
permitir escribir el movimiento
```

Pero guardar movimiento que requiere snapshot necesita estrategia.

Opciones:

1. bloquear guardado hasta conexión;
2. crear movimiento pendiente de sincronización.

Recomendación inicial:

```text
bloquear solo el submit y explicar:
"Necesitas conexión para guardar la tasa del movimiento."
```

Es más seguro para primera versión.

---

# 48. Analytics

Eventos útiles:

```text
venezuela_currency_selector_changed
rate_source_changed
custom_rate_created
movement_created_ves
movement_created_usd_ve
exchange_preview_error
```

No registrar montos exactos en analytics si no es necesario.

---

# 49. Testing UI

Casos:

```text
usuario ES → flujo actual intacto
usuario VE → selector USD/VES
USD → preview VES
VES → preview USD
BCV
Euro
Custom
error de rate API
loading
legacy movement
```

---

# 50. Testing de espacios compartidos

Usuario A:

```text
VE
BCV
```

Usuario B:

```text
VE
Euro
```

Mismo movimiento.

Verificar:

```text
mismo original
diferente secundaria
```

---

# 51. Testing de cambio de país

Caso:

```text
VE → ES
```

Verificar:

- desaparece selector especial en creación;
- movimientos VES existentes siguen legibles;
- datos no se eliminan.

Caso:

```text
ES → VE
```

Verificar:

- aparecen capacidades Venezuela;
- puede definir custom rate.

---

# 52. Componentes sugeridos

```text
VenezuelaCurrencySelector
RateSourceSelector
ExchangePreview
RateBadge
MoneyAmount
ConvertedMoneyAmount
CustomRateModal
HistoricalRateBreakdown
AccountBalanceConversion
CategoryCurrencySummary
```

---

# 53. Hooks sugeridos

```ts
useCurrencyCapabilities();
useExchangeRates();
useExchangePreview();
usePreferredRateSource();
useCustomExchangeRate();
useMovementValuation();
```

---

# 54. Tipos frontend

```ts
type CurrencyCode = 'USD' | 'VES' | 'EUR';

type RateSource = 'BCV' | 'EURO' | 'CUSTOM';
```

---

# 55. Modelo UI de un monto

```ts
type MoneyView = {
  value: string;
  currency: CurrencyCode;
  formatted: string;
};
```

Conversión:

```ts
type ConvertedMoneyView = {
  value: string;
  currency: CurrencyCode;
  formatted: string;
  source: RateSource;
  rate: string;
  effectiveAt: string;
};
```

---

# 56. Orden recomendado de implementación

## Fase 1

- capabilities
- country
- tipos monetarios
- formatter

## Fase 2

- selector USD/VES
- exchange preview
- loading/error states

## Fase 3

- custom rate modal
- preferencia de tasa

## Fase 4

- detalle de movimiento
- preview cards

## Fase 5

- categoría
- cuentas

## Fase 6

- espacios compartidos

## Fase 7

- legacy
- offline
- analytics
- polish

---

# 57. Criterios de aceptación Frontend

La implementación queda lista cuando:

- usuarios no VE siguen viendo exactamente la experiencia actual;
- usuario VE puede elegir USD o VES en agregar movimiento;
- preview cambia en vivo;
- puede elegir BCV, Euro o tasa personalizada;
- puede crear y editar tasa personalizada;
- detalles muestran snapshot histórico;
- preview cards muestran monto original + equivalencia;
- categoría permite cambiar fuente de tasa;
- cuenta VES muestra saldo nominal + equivalencia;
- espacios compartidos respetan preferencia individual;
- un usuario no VE puede seguir viendo movimientos VES;
- estados de loading/error están cubiertos;
- no existen cálculos monetarios duplicados por toda la UI.

---

# 58. Recomendación de UX

No convertir toda la aplicación en una interfaz “multimoneda” permanente.

Para Venezuela, la experiencia ideal debe sentirse simple:

```text
¿Qué monto fue?
[ 10.000 ] [ Bolívares ▼ ]

≈ $190,99 · BCV
```

Y el detalle avanzado aparece solo cuando el usuario lo necesita.

Esto mantiene el modal rápido para el uso diario y desplaza la complejidad hacia los detalles, donde realmente aporta valor.

---

# 59. Contrato de frescura de la tasa (backend, hora Venezuela)

Documentado aquí porque afecta directamente a cómo el frontend debe
presentar la tasa (secciones 10, 40) y a la configuración de cache
(sección 39), aunque la lógica en sí vive enteramente en el backend.

Reglas acordadas con el backend:

```text
Ventana de actualización: 15:00–20:30 hora Venezuela (America/Caracas).
Fuera de esa ventana, la tasa no cambia más ese día.

La tasa del día siguiente se conoce con un día de antelación
(ej. el 11 ya se sabe la tasa del 12), pero no se usa hasta que
empieza ese día. Se sigue usando la tasa del día 11 durante todo
el día 11.

El backend precalcula/guarda la tasa del día siguiente para que el
cambio de tasa al cruzar la medianoche VE sea inmediato, sin esperar
a la siguiente ventana de actualización.
```

Consecuencias para el frontend:

- **No implementar ninguna lógica de horario ni de zona horaria en el
  cliente.** El backend siempre devuelve la tasa vigente para el
  momento de la petición; el frontend solo la pide y la muestra.
- Section 10: la tasa no es "en vivo" en el sentido de cambiar mientras el
  usuario mira la pantalla dentro del mismo día — es fija por día VE. El
  copy de "última actualización" debe reflejar eso (ej. `Tasa BCV del
{fecha}`, no un contador de minutos).
- Section 39/40: el `staleTime` corto de la cache de preview existe para
  que, si la app queda abierta cruzando la medianoche VE, la siguiente
  petición recoja la tasa nueva sin necesitar refrescar la app a mano. No
  usarlo para "pulir" la tasa dentro del mismo día — dentro del mismo día
  el valor no cambia, así que un `staleTime` corto ahí es simplemente
  gratis, no crítico.
- Snapshots históricos (sección 21): un movimiento creado el día 11 debe
  conservar la tasa del día 11 para siempre, aunque se consulte su detalle
  el día 13. Esto ya lo cubre el principio general de snapshot congelado
  al guardar (sección 14): no hay nada adicional que hacer aquí por esta
  regla horaria, solo confirma por qué es importante no recalcular con la
  tasa "actual" en pantallas de detalle/histórico.
