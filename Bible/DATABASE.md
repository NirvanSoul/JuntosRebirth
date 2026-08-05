# DATABASE.md

## 1. Propósito

Este documento define la estrategia de datos de `juntoss`.

Incluye:

- Persistencia local del modo invitado.
- Persistencia remota con Supabase.
- Organización de SQL.
- Modelo preliminar de tablas.
- Row Level Security.
- Sincronización.
- Migración de invitado a cuenta.
- Propiedad y aislamiento por espacios.
- Reglas para cambios de esquema.

Este diseño es una base técnica. Los nombres y campos finales deben validarse durante la implementación.

---

## 2. Principios

1. El usuario invitado trabaja únicamente con datos locales.
2. El usuario autenticado trabaja con datos sincronizados.
3. La interfaz no debe depender directamente de Supabase.
4. Toda información financiera pertenece a un espacio.
5. Toda operación compartida conserva autoría.
6. El cliente nunca es la autoridad final de permisos.
7. Los cambios SQL se versionan mediante migraciones.
8. La migración local-nube debe ser idempotente.
9. No se eliminan datos locales hasta confirmar la migración.
10. Las operaciones destructivas deben ser explícitas y auditables.

---

## 3. Organización de Supabase

```text
supabase/
├── config.toml
├── migrations/
│   ├── 0001_initial_extensions.sql
│   ├── 0002_profiles.sql
│   ├── 0003_spaces.sql
│   ├── 0004_space_members.sql
│   ├── 0005_categories.sql
│   ├── 0006_transactions.sql
│   ├── 0007_rls_policies.sql
│   └── 0008_indexes.sql
├── seed/
│   ├── development.sql
│   └── test.sql
├── functions/
│   ├── accept-space-invitation/
│   ├── migrate-guest-data/
│   └── separate-space/
└── tests/
    ├── profiles.test.sql
    ├── spaces.test.sql
    ├── categories.test.sql
    ├── transactions.test.sql
    └── rls.test.sql
```

Reglas:

- Una migración ya aplicada no se edita.
- Los cambios nuevos se realizan en una migración posterior.
- Los archivos deben tener nombres descriptivos.
- Las políticas pueden dividirse por dominio.
- Las seeds de desarrollo no deben contener datos reales.
- Las Edge Functions no sustituyen funciones SQL cuando una transacción de base de datos sea necesaria.
- Los tipos generados deben actualizarse tras cambios de esquema.

---

## 4. Capas de persistencia

La interfaz consume contratos de repositorio.

```text
UI
  -> caso de uso
  -> repositorio
      -> implementación local
      -> implementación remota
      -> implementación sincronizada
```

Ejemplo conceptual:

```ts
interface TransactionRepository {
  listBySpace(input: ListTransactionsInput): Promise<Transaction[]>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(input: UpdateTransactionInput): Promise<Transaction>;
  archive(id: string): Promise<void>;
}
```

El componente no debe saber si el dato se guarda en almacenamiento local o Supabase.

---

## 5. Persistencia local

### 5.1 Objetivo

Permitir que una persona pruebe la aplicación sin cuenta ni conexión.

### 5.2 Datos locales mínimos

- Perfil invitado.
- Espacio personal local.
- Categorías.
- Movimientos.
- Preferencias.
- Estado de onboarding.
- Estado de sincronización.
- Identificador de instalación.
- Versión del esquema local.

### 5.3 Requisitos

La solución local seleccionada debe:

- Soportar migraciones.
- Permitir consultas por espacio y fecha.
- Conservar tipos.
- Ser adecuada para datos estructurados.
- Funcionar en iOS y Android.
- Manejar escrituras de forma confiable.
- Facilitar exportación para migración.
- No requerir conexión.
- Tener mantenimiento activo.

La persistencia estructurada usa `expo-sqlite` 16, versión compatible con Expo
SDK 54 e incluida en Expo Go. La base se abre en modo WAL, activa claves foráneas
y aplica migraciones incrementales mediante `PRAGMA user_version`. La decisión,
alternativas y plan de retirada están registrados en ADR-050.

El catálogo de espacios local y su selección activa usan AsyncStorage 2.2
mediante `localSpaceRepository`. Es un conjunto pequeño de metadatos versionados
que no requiere consultas. Categorías y movimientos no se guardan en ese
documento: viven en tablas SQLite y se consultan por espacio, fecha, categoría,
archivado y estado de sincronización.

### 5.4 Esquema local actual

La versión 5 contiene:

- `local_metadata`, con el identificador estable de instalación.
- `categories`, con espacio, plantilla opcional, presupuesto, autor local,
  origen de copia, archivado, fechas técnicas y estado de sincronización.
- `transactions`, con importe en unidades menores, moneda, fecha económica,
  recurrencia, serie recurrente opcional, grupo de presentación personalizado
  opcional, categoría y espacio, autor local, origen de copia, archivado,
  fechas técnicas y estado de sincronización.
- `recurring_transaction_series`, con la plantilla de una recurrencia semanal,
  quincenal o mensual, fecha inicial, cantidad de ocurrencias generadas y
  próxima fecha pendiente.
- Índices para consultas por espacio, fecha, categoría y sincronización.
- Una clave foránea compuesta que impide asignar a un movimiento una categoría
  perteneciente a otro espacio.
- `local_sync_account`, que fija tras confirmación explícita la cuenta remota a
  la que pertenece el conjunto invitado y bloquea mezclarlo con otra cuenta.
- `local_sync_batches`, que conserva los intentos, conteos y resultado de cada
  lote para poder reintentar sin declarar éxito antes de tiempo.

Las eliminaciones funcionales archivan la fila y conservan `archived_at`. Una
edición o archivado de una fila ya sincronizada pasa a `pending`; una fila que
nunca salió del dispositivo conserva `local_only`.

La migración desde la versión 1 convierte también los movimientos semanales,
quincenales y mensuales que ya existían. Su primera carga reconoce la ocurrencia
original y completa únicamente las fechas vencidas que falten.

La versión 3 añade `recurrence_group_id`. Todas las ocurrencias creadas juntas
por una recurrencia personalizada comparten este identificador; no altera su
independencia financiera y solo permite plegarlas de forma inequívoca en las
listas. La migración asigna un grupo estable a los lotes personalizados
anteriores usando sus metadatos comunes de creación. Al convertir mediante una
edición cualquier otra recurrencia a personalizada, la actualización de la fila
original y la inserción de las fechas restantes ocurren dentro de la misma
transacción SQLite y comparten un grupo nuevo.

Cambiar entre Único y una frecuencia automática, cambiar la frecuencia
automática o mover la fecha efectiva crea una serie nueva y archiva, en la misma
transacción, la plantilla anterior y sus ocurrencias posteriores. Así ninguna
serie huérfana continúa generando movimientos después de editarla.

La versión 4 migra las seis plantillas que compartían color para que las 18
categorías del catálogo usen 18 tokens distintos. La actualización se limita a
filas predeterminadas que todavía conservan el color anterior, de modo que no
sobrescribe otras personalizaciones.

La versión 6 añade `transaction_reminders`, con el recordatorio manual de un
movimiento concreto: fecha de aviso, horas del día en JSON, los identificadores
de notificación local que devuelve `expo-notifications` y una fila única por
movimiento.

La versión 7 añade `transaction_notification_rules`, una regla por espacio y
tipo de movimiento (gasto o ingreso) con activación, días de antelación y
horas del día, y `transaction_notification_rule_schedules`, una caché
regenerable de lo que cada regla tiene actualmente programado —incluidas
ocurrencias todavía no materializadas de series recurrentes, identificadas por
su clave proyectada— que se reconstruye por completo en cada reconciliación en
lugar de editarse fila a fila. Ambas tablas son independientes de
`transaction_reminders`: el recordatorio manual por movimiento y las reglas
por tipo comparten el mismo servicio de notificaciones locales y un
presupuesto conjunto de notificaciones pendientes, pero no la misma tabla.

No hay una versión 8: el historial de rotación de plantillas de notificación
y el estado del recordatorio diario (ADR-063) se guardan en AsyncStorage, no
en SQLite. Son datos pequeños, no relacionales y sin necesidad de consultas
por espacio — el mismo criterio que ya usa `local_space_repository` para el
catálogo de espacios. Conviven en el mismo mecanismo que las preferencias de
moneda y apariencia (`src/state/appPreferences/`), aunque el historial de
plantillas y el estado del recordatorio diario viven junto a los servicios de
notificación en `src/features/transactions/repositories/` porque necesitan
las utilidades de fecha local de esa misma feature.

### 5.5 Identificadores

Los datos locales deben usar identificadores globalmente únicos desde su creación.

Esto evita tener que sustituir identificadores durante la migración y ayuda a prevenir duplicados.

### 5.6 Estado de sincronización

Estados sugeridos:

- `local_only`
- `pending`
- `syncing`
- `synced`
- `failed`
- `conflict`
- `archived`

No todos los estados tienen que exponerse al usuario.

---

## 6. Modelo remoto preliminar

### 6.1 `profiles`

Amplía la identidad administrada por Supabase Auth.

Campos sugeridos:

```text
id                  uuid, PK, referencia a auth.users
display_name        text
avatar_url          text nullable
locale              text
default_currency    text
created_at          timestamptz
updated_at          timestamptz
```

Reglas:

- Un perfil pertenece a un usuario autenticado.
- El correo no debe duplicarse innecesariamente.
- La moneda por defecto puede usarse al crear el espacio personal.

---

### 6.2 `spaces`

Representa un contexto financiero.

Campos sugeridos:

```text
id                  uuid, PK
name                text
type                text
currency            text
created_by          uuid
created_at          timestamptz
updated_at          timestamptz
archived_at         timestamptz nullable
```

Tipos iniciales:

- `personal`
- `couple`

Tipos futuros posibles:

- `family`
- `household`
- `trip`
- `group`
- `other`

No se deben introducir restricciones SQL que hagan imposible añadir nuevos tipos sin una migración consciente.

---

### 6.3 `space_members`

Relación entre personas y espacios.

Campos sugeridos:

```text
id                  uuid, PK
space_id            uuid, FK
user_id             uuid, FK
role                text
status              text
joined_at           timestamptz
left_at             timestamptz nullable
created_at          timestamptz
updated_at          timestamptz
```

Roles iniciales:

- `owner`
- `member`

Estados posibles:

- `pending`
- `active`
- `left`
- `removed`

Restricciones:

- Un usuario no debe tener dos membresías activas idénticas en el mismo espacio.
- Un espacio personal debe tener un único miembro activo.
- La base de datos no debe asumir que todo espacio compartido tendrá exactamente dos miembros, aunque la interfaz inicial de pareja sí lo haga.

---

### 6.4 `space_invitations`

Invitaciones a un espacio compartido.

Campos sugeridos:

```text
id                  uuid, PK
space_id            uuid, FK
invited_by          uuid, FK
invitee_email       text nullable
token_hash          text
status              text
expires_at          timestamptz
accepted_by         uuid nullable
created_at          timestamptz
accepted_at         timestamptz nullable
```

Reglas:

- No almacenar tokens de invitación en texto plano.
- Las invitaciones deben caducar.
- Aceptar una invitación debe ser idempotente.
- Una invitación no debe permitir acceso antes de la aceptación válida.

---

### 6.5 `categories`

Campos sugeridos:

```text
id                  uuid, PK
space_id            uuid, FK
name                text
icon                 text nullable
color_token          text nullable
budget_amount_minor  bigint nullable
created_by           uuid
is_default           boolean
is_archived          boolean
source_category_id   uuid nullable
created_at           timestamptz
updated_at           timestamptz
```

Reglas:

- La categoría pertenece a un espacio.
- Puede contener gastos e ingresos.
- `source_category_id` puede registrar el origen de una copia tras separación.
- La eliminación física debe evitarse cuando existan movimientos asociados.
- Los nombres no necesitan ser globalmente únicos.
- Puede definirse unicidad normalizada por espacio si la experiencia lo requiere.
- Un presupuesto, cuando exista, se expresa en unidades menores y debe ser mayor que cero.
- El nombre, icono, color y archivado de una categoría solo puede modificarlos
  su autor (`categories_update_author`). El presupuesto es la excepción:
  cualquier miembro activo del espacio puede fijarlo o retirarlo mediante
  `update_category_budget`, sin ganar permiso sobre el resto de campos.

---

### 6.6 `transactions`

Campos sugeridos:

```text
id                  uuid, PK
space_id            uuid, FK
created_by           uuid, FK
category_id         uuid, FK
type                text
amount_minor        bigint
currency            text
title               text
occurred_on          date
recurrence_id       uuid nullable
source_local_id     uuid nullable
sync_batch_id       uuid nullable
is_archived         boolean
created_at          timestamptz
updated_at          timestamptz
```

Tipos:

- `expense`
- `income`

Reglas:

- Guardar dinero en unidades menores, no en punto flotante.
- `amount_minor` debe ser mayor que cero.
- El signo no define el tipo; lo define `type`.
- La moneda debe registrarse en el movimiento.
- La categoría debe pertenecer al mismo espacio.
- Todo movimiento debe tener una categoría.
- El creador debe ser miembro activo al crear el movimiento.
- `source_local_id` ayuda a idempotencia durante migración.
- La fecha económica puede diferir de la fecha de creación.

---

### 6.7 `recurrences`

Campos sugeridos:

```text
id                  uuid, PK
space_id            uuid, FK
created_by          uuid, FK
frequency           text
interval_value      integer
starts_on           date
ends_on             date nullable
next_run_on         date nullable
template_data       jsonb
status              text
created_at          timestamptz
updated_at          timestamptz
```

La persistencia local ya implementa el equivalente acotado
`recurring_transaction_series`. Las frecuencias automáticas se conservan como
series sin fecha final y materializan las ocurrencias vencidas al cargar los
movimientos; quincenal usa intervalos de 15 días. La recurrencia personalizada
no necesita una serie abierta: crea en una transacción local una ocurrencia por
cada fecha exacta seleccionada.

Los reportes temporales y Mapa proyectan en memoria las ocurrencias automáticas
del periodo visible. Esta proyección no inserta filas futuras ni cambia
`generated_occurrences`; al llegar la fecha, la materialización transaccional
sigue siendo la autoridad persistida. La excepción es una edición explícita de
una ocurrencia futura: el repositorio materializa de forma transaccional las
ocurrencias hasta la fecha elegida con la plantilla anterior y usa esa fila como
punto efectivo del cambio hacia adelante. Inicio limita esa misma proyección
al último día del mes local actual.

La edición de una ocurrencia automática que mantiene su frecuencia actualiza en
una sola transacción la ocurrencia elegida, las ocurrencias posteriores ya
materializadas y la plantilla que generará las siguientes. Las filas anteriores
a la fecha efectiva no se reescriben, tanto si representan gastos como ingresos.

La tabla remota conserva ya las series durante la migración invitado-cuenta para
no perder frecuencia, plantilla ni próxima fecha. Esta primera conexión no
ejecuta todavía recurrencias con la aplicación cerrada: la materialización local
sigue siendo la autoridad hasta definir y probar el proceso remoto de la fase
13. Las ocurrencias subidas son idempotentes por instalación, serie y fecha.

Debe decidirse si:

- Se generan movimientos futuros.
- Se genera cada movimiento al llegar la fecha.
- La app solo recuerda al usuario.
- El backend ejecuta la recurrencia.

---

### 6.8 `transaction_notification_rules`

Preparada en migración (`202608040002_transaction_notification_rules.sql`),
sin conectar todavía: la app no tiene sesión ni cliente Supabase en runtime.

```text
id                    uuid, PK
space_id              uuid, FK
transaction_type      text ('expense' | 'income')
is_enabled            boolean
days_before           integer
times                 jsonb
created_by            uuid, FK
source_installation_id text
source_local_id        text
created_at            timestamptz
updated_at            timestamptz
```

Reglas:

- Una fila por `(space_id, transaction_type)`: la regla es la configuración
  compartida de ese tipo de movimiento en ese espacio, no una preferencia
  individual por miembro.
- A diferencia de categorías o movimientos, cualquier miembro activo del
  espacio puede leer y actualizar la fila, no solo quien la creó —el objetivo
  es que cualquiera pueda activar, desactivar o ajustar el aviso compartido,
  igual que `update_category_budget` ya permite para el presupuesto de una
  categoría sin abrir el resto de sus campos.
- Solo se sincroniza la configuración de la regla. Los identificadores de
  notificación local de `expo-notifications` y su ventana de reconciliación
  (`transaction_notification_rule_schedules` en SQLite) son estado de
  dispositivo sin sentido fuera de él y no tienen equivalente remoto.

---

### 6.9 `savings_goals`

Modelo futuro:

```text
id                  uuid, PK
space_id            uuid, FK
created_by          uuid, FK
name                text
target_amount_minor bigint
currency            text
target_date         date nullable
status              text
created_at          timestamptz
updated_at          timestamptz
```

No debe crearse en la primera migración si la feature no está incluida en la fase activa.

---

### 6.10 `goal_contributions`

Modelo futuro para aportaciones a metas.

Debe conservar:

- Objetivo.
- Autor.
- Importe.
- Fecha.
- Movimiento asociado opcional.
- Estado.

---

## 7. Dinero

Reglas obligatorias:

- No usar `float` para importes.
- Usar enteros en unidades menores.
- Conservar moneda.
- Formatear según locale en presentación.
- No realizar conversiones implícitas.
- Definir reglas de redondeo.
- Probar importes grandes y decimales.
- El balance se calcula como ingresos menos gastos.

Ejemplo:

```text
10,50 EUR -> amount_minor = 1050
```

---

## 8. Fechas y zonas horarias

Diferenciar:

- `occurred_on`: fecha financiera elegida por el usuario.
- `created_at`: instante técnico de creación.
- `updated_at`: instante técnico de modificación.

Para movimientos diarios, una fecha sin hora puede ser más estable que un timestamp convertido entre zonas horarias.

Una fila cuyo `occurred_on` pertenece a un mes posterior al mes local actual
representa un movimiento programado fuera del horizonte financiero visible. Se
conserva en persistencia y puede mostrarse en el calendario, pero no participa
todavía en balances, totales, presupuestos ni actividad. Las fechas restantes
del mes actual sí participan para ofrecer una proyección completa del mes. La
comparación usa cadenas locales `YYYY-MM-DD` para evitar adelantos o retrasos
por conversión UTC y aplica igual a gastos e ingresos.

Las recurrencias y notificaciones sí pueden requerir zona horaria explícita.

---

## 9. Row Level Security

RLS debe estar activado en todas las tablas que contengan datos de usuario.

### 9.1 Regla general

Un usuario puede acceder a una fila de un espacio únicamente si tiene una membresía activa y la operación está permitida por su rol.

### 9.2 Perfiles

- Leer y editar el perfil propio.
- Lectura limitada de perfiles de miembros compartidos solo si la interfaz la necesita.
- No exponer campos innecesarios.

### 9.3 Espacios

- Leer espacios con membresía activa.
- Crear espacios mediante una operación controlada.
- Actualizar según rol.
- Archivar o disolver mediante operación sensible.

### 9.4 Miembros

- Ver miembros de espacios propios.
- No modificar roles libremente desde el cliente.
- Aceptar invitaciones mediante función controlada.
- Registrar salida sin borrar historial.

### 9.5 Categorías

- Leer categorías del espacio.
- Crear si se es miembro activo.
- Editar o archivar según permisos.
- Validar que `created_by` sea el usuario autenticado o se asigne en servidor.

### 9.6 Movimientos

- Leer movimientos del espacio.
- Crear dentro de un espacio con membresía activa.
- Evitar falsificar autoría.
- Definir si todos los miembros pueden editar movimientos ajenos.
- Preferir políticas explícitas y simples.

---

## 10. Funciones de base de datos

Las operaciones que cambian varias tablas deben ejecutarse de forma transaccional.

Candidatas:

- Crear espacio personal.
- Crear espacio de pareja.
- Aceptar invitación.
- Migrar lote de datos invitados.
- Disolver espacio.
- Separar categorías.
- Archivar un espacio.
- Transferir rol de propietario.

Estas funciones deben:

- Validar identidad.
- Validar membresía.
- Bloquear condiciones inválidas.
- Ser idempotentes cuando sea posible.
- Devolver resultados claros.
- Evitar estados parciales.

La primera implementación remota incorpora `ensure_personal_space` y
`migrate_guest_data`. La migración recibe un lote JSON, resuelve cada espacio
local mediante `space_local_sources`, fuerza `created_by = auth.uid()` y aplica
categorías, series y movimientos dentro de una única transacción PostgreSQL.
No confía en un usuario enviado por el cliente.

`update_category_budget` cubre el único campo de categoría que un miembro no
autor puede modificar. Valida sesión, pertenencia activa al espacio de la
categoría y que el importe sea nulo o mayor que cero, y solo toca
`budget_amount_minor`; el resto de la fila permanece protegido por
`categories_update_author`.

---

## 11. Creación del espacio personal

Al registrarse un usuario:

1. Se crea o confirma su perfil.
2. Se comprueba si ya existe espacio personal.
3. Si no existe, se crea.
4. Se crea membresía como propietario.
5. Se crean categorías predeterminadas.
6. Se devuelve el espacio.

La operación debe ser idempotente.

No debe depender exclusivamente de que una pantalla se haya abierto correctamente.

---

## 12. Migración de invitado a cuenta

### 12.1 Objetivo

Subir los datos locales a la cuenta sin pérdida ni duplicación.

### 12.2 Flujo propuesto

1. Bloquear temporalmente nuevas escrituras o registrarlas en una cola.
2. Crear o recuperar cuenta.
3. Verificar correo.
4. Crear o recuperar espacio personal remoto.
5. Generar `sync_batch_id`.
6. Subir categorías.
7. Crear mapa entre categorías locales y remotas.
8. Subir movimientos.
9. Validar conteos y resultados.
10. Marcar lote como completado.
11. Marcar datos locales como sincronizados.
12. Reanudar operaciones.
13. Conservar respaldo local temporal.
14. Limpiar únicamente según política definida.

### 12.3 Idempotencia

Cada fila migrada debe contener un identificador local estable.

Restricción sugerida:

```text
unique(user_id or space_id, source_local_id)
```

La restricción exacta dependerá de la tabla.

Repetir la migración debe devolver el elemento existente o actualizarlo de manera segura, no duplicarlo.

### 12.4 Fallos

Si falla:

- No eliminar datos locales.
- Mostrar estado recuperable.
- Permitir reintentar.
- Registrar error seguro.
- Evitar volver a subir elementos confirmados.
- No dejar categorías sin correspondencia.

---

## 13. Estrategia de sincronización

La primera versión puede elegir una de estas estrategias.

### Opción A: remoto después del registro

- Invitado: local.
- Registrado: remoto.
- Los datos se cargan desde Supabase.
- La caché local es secundaria.

Ventajas:

- Menor complejidad.

Riesgos:

- Peor experiencia sin conexión.

### Opción B: local-first sincronizado

- Toda escritura se guarda localmente.
- Se sincroniza en segundo plano.
- La UI lee de la base local.

Ventajas:

- Experiencia rápida y offline.

Riesgos:

- Mayor complejidad de conflictos.

### Estrategia seleccionada

ADR-050 adopta local-first para categorías y movimientos:

- Toda mutación se confirma primero en SQLite.
- La interfaz lee los datos locales y funciona sin conexión.
- El modo invitado mantiene filas `local_only` y no intenta escribir en nube.
- Cuando exista autenticación y Supabase, las filas sincronizadas que cambien
  pasarán a `pending` y se enviarán en segundo plano.
- Un borrado se representará mediante la fila archivada, no mediante la pérdida
  local de la intención.

La conexión inicial añade el transporte específico para convertir datos de
invitado y reenviar cambios locales pendientes después de iniciar sesión:

- El cliente oficial de Supabase conserva la sesión móvil en SecureStore y usa
  AsyncStorage únicamente en web.
- `syncPendingLocalDataForCurrentSession` exige una sesión real antes de formar
  o enviar el lote.
- La primera cuenta requiere confirmación explícita; después el dispositivo
  queda asociado a ese `user_id` y una cuenta distinta se rechaza.
- El RPC remoto aplica el lote completo de forma transaccional e idempotente.
- SQLite solo marca las filas `synced` después de comprobar identificador y
  conteos confirmados por PostgreSQL. Un fallo las deja `failed` para reintento.

La suscripción automática al estado de autenticación, el pull remoto, la cola
continua, los conflictos y la edición simultánea permanecen en las fases 7, 9 y
15; no se simula una sesión antes de implementar ese flujo.

---

## 14. Conflictos

Los conflictos futuros pueden surgir cuando:

- Dos miembros editan el mismo movimiento.
- Un dispositivo sin conexión edita un dato ya modificado.
- Una categoría es archivada mientras otro usuario la utiliza.
- Se cambia de espacio durante una sincronización.

La primera versión debe evitar edición colaborativa compleja.

Política inicial posible:

- Última escritura para campos no sensibles.
- Rechazo explícito para operaciones incompatibles.
- Confirmación para acciones destructivas.
- Historial o auditoría para operaciones importantes.

No implementar resolución compleja antes de necesitarla.

---

## 15. Separación de pareja o grupo

Esta operación requiere una decisión de producto y seguridad.

### 15.1 Principios acordados

- Los movimientos compartidos no se copian automáticamente al espacio personal del otro miembro.
- La autoría debe conservarse.
- Las categorías creadas durante el espacio pueden copiarse a ambos espacios personales.
- La copia no debe crear duplicados equivalentes.
- El espacio compartido puede archivarse en lugar de borrarse.
- El acceso posterior dependerá de la política aprobada.

### 15.2 Proceso posible

1. Confirmar intención.
2. Congelar nuevas operaciones sensibles.
3. Registrar miembros y estado.
4. Copiar categorías elegibles.
5. Crear nuevos identificadores.
6. Registrar `source_category_id`.
7. Archivar o cambiar estado del espacio.
8. Desactivar membresías.
9. Conservar auditoría.
10. Notificar resultado.

La función debe ser transaccional o implementar compensación segura.

---

## 16. Índices

Índices iniciales probables:

- `space_members(user_id, status)`
- `space_members(space_id, status)`
- `transactions(space_id, occurred_on desc)`
- `transactions(space_id, category_id, occurred_on desc)`
- `transactions(created_by, created_at desc)`
- `categories(space_id, is_archived)`
- `space_invitations(token_hash)`
- `space_invitations(invitee_email, status)`

No añadir índices sin observar patrones de consulta o justificar su uso.

---

## 17. Archivado frente a borrado

Preferir archivado para:

- Categorías con movimientos.
- Espacios con historial.
- Objetivos con aportaciones.
- Elementos compartidos.

El borrado físico puede reservarse para:

- Datos temporales.
- Invitaciones caducadas según política.
- Datos sin referencias.
- Solicitudes de eliminación conforme a requisitos legales y de privacidad.

La interfaz debe diferenciar “ocultar”, “archivar”, “abandonar” y “eliminar”.

---

## 18. Auditoría

Operaciones que pueden requerir auditoría:

- Creación de espacio.
- Invitaciones.
- Cambios de rol.
- Salida de miembros.
- Disolución.
- Migración.
- Eliminación.
- Cambios sensibles de movimiento.

No se necesita auditar cada interacción visual.

Los registros de auditoría no deben exponer más datos financieros de los necesarios.

---

## 19. Límites de plan y pagos

Los límites comerciales futuros deben centralizarse.

Ejemplos:

- Número de espacios.
- Número de miembros.
- Funciones avanzadas.
- Historial.
- Exportaciones.

No dispersar condiciones como:

```ts
if (spaces.length >= 2) ...
```

Preferir una capa de capacidades:

```ts
capabilities.canCreateSpace
capabilities.maxSpaces
```

La autorización de pago y sus webhooks deben verificarse en backend.

No confiar en una bandera enviada por el cliente.

---

## 20. Stripe

La integración futura debe:

- Mantener secretos fuera de la app.
- Crear sesiones o intenciones en backend.
- Verificar webhooks.
- Registrar estado de suscripción.
- Hacer idempotentes los eventos.
- No desbloquear funciones únicamente por respuesta local.
- Contemplar restauración de compras o requisitos de las tiendas si aplica.

La estrategia de pagos móviles debe revisarse según las reglas vigentes de distribución antes de implementarse.

---

## 21. Tipos generados

Después de cada cambio de esquema:

- Regenerar tipos.
- Revisar diferencias.
- No editar el archivo generado manualmente.
- Adaptar mapeos de dominio.
- Ejecutar typecheck.
- Confirmar que los campos opcionales reflejan la base.

Los tipos de base de datos no tienen que ser idénticos a las entidades de dominio.

---

## 22. Seeds

Las seeds deben:

- Ser deterministas.
- Usar datos ficticios.
- Crear casos personales y compartidos.
- Incluir movimientos de gasto e ingreso.
- Incluir categorías mixtas.
- Incluir miembros activos e inactivos.
- Facilitar pruebas de RLS.

No incluir claves, correos reales ni información financiera real.

---

## 23. Pruebas obligatorias de datos

### 23.1 Espacios

- Miembro activo puede leer.
- No miembro no puede leer.
- Miembro de otro espacio no puede leer.
- Usuario puede acceder a su espacio personal.
- Espacio archivado aplica la política correcta.

### 23.2 Movimientos

- Crear gasto.
- Crear ingreso.
- Importe cero rechazado.
- Categoría de otro espacio rechazada.
- Autor falsificado rechazado.
- Lectura cruzada rechazada.
- Archivado funciona.
- Balance correcto.

### 23.3 Categorías

- Ingreso y gasto pueden usar la misma categoría.
- Categoría archivada se trata correctamente.
- Categoría de otro espacio no puede asignarse.
- Copia de separación es idempotente.

### 23.4 Migración

- Primer intento exitoso.
- Reintento sin duplicados.
- Fallo parcial.
- Categorías antes que movimientos.
- Datos locales conservados.
- Cuenta equivocada requiere confirmación.

### 23.5 Invitaciones

- Caducidad.
- Token inválido.
- Doble aceptación.
- Usuario ya miembro.
- Invitación revocada.

---

## 24. Seguridad de datos locales

Evaluar:

- Qué datos necesitan cifrado.
- Qué datos van en almacenamiento seguro.
- Qué datos pueden vivir en base local.
- Qué ocurre al cerrar sesión.
- Qué ocurre al cambiar de cuenta.
- Qué ocurre al borrar la aplicación.
- Cómo se protege un respaldo temporal de migración.

Tokens y credenciales deben usar almacenamiento seguro, no almacenamiento general.

---

## 25. Cambios destructivos

Antes de eliminar o cambiar una columna:

1. Confirmar uso.
2. Crear migración de transición.
3. Migrar datos.
4. Actualizar aplicación.
5. Mantener compatibilidad cuando existan versiones antiguas.
6. Observar.
7. Eliminar en una migración posterior.

No combinar eliminación destructiva con despliegue de cliente que todavía depende del campo.

---

## 26. Checklist de migración SQL

- [ ] La migración tiene nombre descriptivo.
- [ ] Se revisaron efectos destructivos.
- [ ] Se añadieron restricciones.
- [ ] Se añadieron o actualizaron políticas.
- [ ] Se revisaron índices.
- [ ] Se actualizaron funciones.
- [ ] Se añadieron pruebas.
- [ ] Se regeneraron tipos.
- [ ] Se actualizaron seeds.
- [ ] Se actualizó documentación.
- [ ] Se definió rollback o mitigación.
- [ ] Se consideraron versiones antiguas de la app.

---

## 27. Decisiones pendientes

Deben resolverse antes de las fases correspondientes:

1. Política exacta de edición de movimientos ajenos. Resuelta para
   movimientos: `transactions_update_author` ya limita la edición al autor.
   Resuelta como excepción explícita para el presupuesto de categoría, editable
   por cualquier miembro activo mediante `update_category_budget`; el resto de
   campos de una categoría ajena sigue sin poder editarse.
2. Política de historial tras separación.
3. Unicidad de categorías por espacio.
4. Ejecución remota de recurrencias cuando la aplicación no se abre.
5. Retención de datos locales tras migración.
6. Auditoría necesaria.
7. Capacidades del plan gratuito.
8. Estrategia de pagos compatible con distribución móvil.

---

## 28. Principio final

> La base de datos protege los límites del producto incluso cuando el cliente comete un error.

La interfaz puede ocultar o mostrar acciones, pero la base de datos debe impedir accesos y estados inválidos.
