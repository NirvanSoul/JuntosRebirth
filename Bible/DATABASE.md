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
- `categories`, con espacio, plantilla opcional, presupuesto, nota libre
  opcional (desde la versión 8), autor local, origen de copia, archivado,
  fechas técnicas y estado de sincronización.
- `transactions`, con importe en unidades menores, moneda, fecha económica,
  recurrencia, serie recurrente opcional, grupo de presentación personalizado
  opcional, nota libre opcional (desde la versión 8), categoría y espacio,
  autor local, origen de copia, archivado, fechas técnicas y estado de
  sincronización.
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

El historial de rotación de plantillas de notificación y el estado del
recordatorio diario (ADR-063) se guardan en AsyncStorage, no en SQLite. Son
datos pequeños, no relacionales y sin necesidad de consultas por espacio — el
mismo criterio que ya usa `local_space_repository` para el catálogo de
espacios. Conviven en el mismo mecanismo que las preferencias de moneda y
apariencia (`src/state/appPreferences/`), aunque el historial de plantillas y
el estado del recordatorio diario viven junto a los servicios de notificación
en `src/features/transactions/repositories/` porque necesitan las utilidades
de fecha local de esa misma feature.

La versión 8 añade una columna `note` de texto libre y opcional a `categories`
y a `transactions`. Es una nota manual sin formato pensada para listas o
detalles cortos sobre una categoría o un movimiento concreto; no participa en
totales, filtros ni recurrencia. Se edita desde un sub-modal dedicado
(`NoteEditorModal`) abierto mediante un botón en el detalle de cada categoría
o movimiento, con guardado explícito. Una ocurrencia proyectada de una serie
recurrente (sin fila propia todavía) no admite nota hasta materializarse.

La versión 9 añade `local_profile`, una fila única (`singleton_id = 1`) con
`avatar_path` y `avatar_updated_at`. Guarda la foto de perfil del modo
invitado: `avatar_path` apunta a un archivo JPEG dentro de
`Paths.document/avatars/`, recomprimido a un máximo de 512×512 px y calidad
0.6 con `expo-image-manipulator` antes de guardarse, para no acumular
imágenes pesadas en el dispositivo. `avatar_updated_at` solo se usa para
invalidar la caché de imagen de React Native al cambiar la foto (se añade
como parámetro `?v=` a la uri leída), no como estado de sincronización. Esta
tabla es exclusivamente local.

Desde la migración 25, la foto sí viaja: se sube al bucket privado `avatars`
con la ruta `{user_id}/avatar.jpg` y su ubicación se publica en
`public.profiles.avatar_path`. La decisión que esta sección dejaba pendiente
—si el archivo debía subirse a Supabase Storage— queda resuelta que sí. La
miniatura se recomprime a 320×320 y calidad 0,7 antes de salir del dispositivo,
de modo que pesa entre 25 y 40 KB: el sitio donde se muestra más grande son los
56 px de Ajustes, que en una pantalla @3x son 168 px reales.

La versión 10 sustituye el presupuesto local implícitamente asociado a EUR
por `category_budgets`, una tabla por categoría y moneda. La columna histórica
`categories.budget_minor` se conserva únicamente para migrar los valores ya
existentes.

La versión 11 añade `import_merchant_rules`: reglas personales locales de
importación, únicas por `space_id + normalized_merchant`, que asocian un
comercio normalizado con una categoría del mismo espacio. Cada corrección
explícita actualiza la regla existente y conserva su contador de
confirmaciones; su `sync_status` deja preparada la sincronización posterior
sin enviar información mientras el usuario sea invitado.

La versión 12 añade `import_batches` e `import_items` locales. Solo guardan
las filas ya normalizadas y sus datos de revisión —categoría final, selección,
duplicado, avisos y movimiento creado—; nunca el archivo original ni su JSON
completo. La FK compuesta de cada ítem evita que una categoría de otro espacio
se asigne durante la revisión. Las actualizaciones de revisión son
transaccionales y el batch queda marcado como `imported` al asociar los
movimientos creados.

La versión 13 añade `remote_entity_links`, el mapa persistente por cuenta
entre IDs remotos y locales para espacios, categorías y movimientos. Es la
autoridad para restaurar datos sincronizados en otra instalación: nunca se
infieren categorías por su nombre.

La versión 14 añade `import_batches.file_hash`, un hash del archivo
original (no el archivo en sí) para avisar si el usuario reimporta el mismo
extracto; es solo informativo, nunca bloquea por sí solo.

La versión 15 añade `merchant_feedback_queue` local: comercios confirmados
con una categoría canónica (`templateKey`), listos para alimentar el
consenso comunitario en cuanto su `import_item` remoto exista con categoría
final. Único por `import_item_id`, para no encolar el mismo voto dos veces.

La versión 16 añade `local_profile.display_name`. Guarda el nombre indicado
durante el onboarding en la misma fila local que el avatar, sin sustituirlo;
se conserva para personalizar el modo invitado y estará disponible para una
migración posterior a una cuenta autenticada.

La versión 17 añade `space_member_profiles`, con clave primaria
`(space_id, user_id)`. Guarda el censo de un espacio compartido —nombre y foto
de cada miembro activo— para poder atribuir un movimiento a su autor sin
mostrar un uuid. Es una caché de lectura de `public.profiles`, no una fuente de
verdad: se reemplaza entera por espacio en cada sincronización, de modo que
quien abandona el espacio también desaparece en local.

La versión 18 cierra el circuito de la foto de perfil, que hasta entonces no
salía del dispositivo. `local_profile` gana `avatar_sync_status` —con el mismo
juego de valores que el resto de tablas— y `avatar_remote_path`.
`space_member_profiles` se recrea con `avatar_path` (la ruta del objeto en
Storage), `avatar_updated_at` (el sello con el que se decide si redescargar) y
`avatar_cached_uri` (la copia local ya descargada), en lugar de la antigua
`avatar_url`, que prometía una url que nunca existió.

El archivo cacheado se guarda en `Paths.document/avatars/members/` con el sello
incrustado en el nombre (`{userId}__{selloSinSeparadores}.jpg`). Esa convención
evita una columna extra para recordar a qué versión corresponde la copia: el
propio nombre lo dice, así que basta compararlo con el sello que llega del
censo para saber si hay que volver a bajar la foto.

La versión 19 añade `space_member_profiles.default_currency`. Un espacio
compartido ofrece las monedas de todas las personas que lo usan, no solo la
suya: si una trabaja en VES y la otra en EUR, cada una necesita ver y poder
elegir la del otro. Sin esa columna, quien se une a un espacio en una moneda
que no tiene activa lo encuentra vacío, porque el resumen se filtra a una
moneda en la que no hay ningún movimiento.

La unión la calcula `listSpaceCurrencies` (`src/features/spaces/utils/`), que
ordena la moneda del espacio primero —es donde está el grueso de sus
movimientos y actúa de valor por defecto— y después las propias y las de los
demás miembros. El tope de `maxActiveCurrencies` no se aplica aquí: limita
cuántas monedas gestiona una persona, no cuántas puede tener un espacio
compartido entre dos.

Al iniciar una sesión autenticada o cambiar las preferencias, la primera
moneda activa se replica en `profiles.default_currency`. Es la moneda
principal visible para los demás miembros y la que se usa al crear un espacio
compartido; las preferencias adicionales permanecen locales y se incorporan a
la lista del espacio por quien las haya activado.

La versión 20 añade `money_accounts`: la cuenta es el segundo eje de
clasificación de un movimiento, opcional y con saldo propio. Guarda espacio,
nombre, tipo (`cash`, `bank`, `card`), icono, color,
moneda, saldo inicial en unidades menores, autor, archivado, fechas técnicas y
estado de sincronización. El saldo inicial admite cero y negativos: una
tarjeta de crédito arranca con deuda. `transactions` y
`recurring_transaction_series` ganan una columna `money_account_id` nula.

Esa columna usa una foránea de una sola columna, no la compuesta
`(id, space_id)` que sí protege a `category_id`: SQLite no admite una foránea
de dos columnas en `ALTER TABLE ADD COLUMN`, y reconstruir `transactions`
reescribiría de paso la foránea de `transaction_reminders` —el procedimiento
seguro que documenta SQLite exige `PRAGMA foreign_keys = OFF` fuera de la
transacción, una reconstrucción que el migrador no hace sobre
`transactions`—. La coincidencia de espacio y de moneda se valida entonces en
`localTransactionRepository`
(`assertMoneyAccountAssignment`), y en Postgres, que es la autoridad real, la
migración 28 sí declara la foránea compuesta.

La versión 24 añade `money_account_balances`: una cuenta puede guardar varias
monedas, como hace un banco, y cada una lleva su propio saldo inicial. Sigue el
patrón de `category_budgets`. `money_accounts.currency` se conserva como moneda
principal —la que encabeza la tarjeta y se propone al registrar un
movimiento—, pero `money_accounts.opening_balance_minor` deja de leerse: el
saldo inicial vive siempre en la tabla hija, incluida la moneda principal, para
no mantener dos fuentes del mismo dato.

La versión 25 repara de forma no destructiva instalaciones de desarrollo que
quedaron marcadas como versión 20 sin que `money_accounts` ni las columnas
opcionales de movimientos y series llegaran a crearse. Antes de avanzar por la
escalera, comprueba la tabla y esas dos columnas; si faltan, las crea dentro de
la misma transacción y deja los movimientos existentes con cuenta nula. La
base no se borra automáticamente ante otro error de migración: conservar los
datos permite repararlos o exportarlos sin convertir un fallo de esquema en
pérdida de información.

La versión 23 repara la foránea que dejó colgando la versión 22. Al
reconstruir `money_accounts` con `ALTER TABLE ... RENAME`, SQLite reescribió
las referencias de `transactions` y `recurring_transaction_series` para que
apuntaran a `money_accounts_v20`, que acto seguido se borraba: asignar una
cuenta a un movimiento fallaba con «no such table». La reparación son dos
renombrados y ningún copiado —el primero adopta el nombre que la referencia
rota espera y el segundo devuelve la tabla a su nombre reescribiéndola—, y es
idempotente.

Es el mismo mecanismo que ya obligaba a no reconstruir `transactions` (ver la
versión 20), aplicado esta vez a la propia tabla de cuentas.

La versión 22 reduce los tipos de cuenta a tres: efectivo, cuenta bancaria y
tarjeta. Distinguir débito, crédito y ahorro no aporta nada mientras el saldo
se calcule igual en todos y no existan límite de crédito ni transferencias, y
sí obliga a elegir entre opciones que para el usuario son la misma. Las filas
anteriores se reasignan en la misma tabla —débito y crédito a tarjeta, ahorro
a cuenta bancaria—. La reconstrucción local se hace con las foráneas
temporalmente desactivadas y `legacy_alter_table` activo antes de la
transacción; así las tablas hijas conservan su referencia al nombre final y
`PRAGMA foreign_key_check` debe quedar limpio antes del `COMMIT`.

La versión 21 añade `money_account` a los valores admitidos por
`remote_entity_links.entity_type`. Como un CHECK de SQLite no se puede
alterar, la tabla se reconstruye copiando sus filas; nada la referencia, así
que la reconstrucción es segura.

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
activated_at        timestamptz nullable
archived_at         timestamptz nullable
```

`activated_at` marca el momento en que el espacio pasó a ser real. Es null
solo en un espacio juntos cuya invitación sigue pendiente (§6.4.1); en
cualquier otro espacio lleva fecha desde su creación, por el `default now()`
de la columna.

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

Invitaciones a un espacio compartido. Implementada en
`07_couple_space_invitations.sql` (ADR-068), solo para espacios
`type = 'couple'`.

```text
id                  uuid, PK
space_id            uuid, FK (on delete cascade)
invited_by          uuid, FK (on delete set null)
invitee_email       text nullable (normalizado a minúsculas; null = invitación por enlace)
token_hash          text, unique (sha-256 hex del token; el token en texto plano nunca se guarda)
status              text ('pending' | 'accepted' | 'revoked')
expires_at          timestamptz (default now() + 7 días)
accepted_by         uuid nullable
created_at          timestamptz
accepted_at         timestamptz nullable
```

Reglas:

- No almacenar tokens de invitación en texto plano: solo su hash. El texto
  plano solo existe en el valor de retorno de `create_space_invitation()`
  para construir un enlace compartible manualmente.
- No existe un estado `'expired'` almacenado: se calcula al leer
  (`expires_at < now()`), para no depender de un job programado que este
  proyecto no tiene configurado.
- Desde la migración 36 solo existe una invitación `pending` por espacio.
  Cambiar el correo revoca la anterior antes de insertar la nueva, para que la
  primera persona ya no pueda aceptar después de invitar a otra.
- Aceptar una invitación es idempotente (`accept_space_invitation`, mismo
  usuario) y valida que el correo de quien acepta coincida con
  `invitee_email` cuando la invitación se creó para un correo concreto.
- Una invitación no debe permitir acceso antes de la aceptación válida: la
  tabla no tiene ninguna política de insert/update/delete, solo `select`
  para miembros activos del espacio o quien la creó. Toda mutación pasa por
  funciones `SECURITY DEFINER`.
- La tabla no expone `invitee_email` sin sesión: `get_space_invitation_preview()`
  (la única función con permiso `anon`, necesaria porque el enlace puede
  abrirse sin sesión) devuelve el correo enmascarado (`f***@gmail.com`), no
  la fila completa.

Funciones asociadas: `create_couple_space(p_name, p_currency)`,
`create_space_invitation(p_space_id, p_invitee_email)`,
`get_space_invitation_preview(p_token)`, `accept_space_invitation(p_token)`,
`leave_couple_space(p_space_id)`. Ver ADR-083 para el ciclo de vida de salida.

La migración `16_in_app_space_invitations.sql` deja de enviar invitaciones con
Resend. Una invitación dirigida solo se crea si ese correo ya pertenece a una
cuenta; `get_current_user_pending_space_invitation()` la muestra únicamente a
la sesión cuyo correo coincide y `accept_current_user_space_invitation(id)` la
acepta de forma controlada. El cliente actual exige correo y no ofrece generar,
copiar ni compartir enlaces. Los RPC de vista previa y aceptación por token se
mantienen solo para no invalidar enlaces creados por versiones anteriores.

La migración `17_fix_space_invitation_column_reference.sql` corrige una
referencia ambigua a `id` dentro del RPC de creación: tanto la invitación
dirigida como el enlace manual vuelven a poder crearse en instalaciones que
ya aplicaron la versión 16.

La migración `36_invitation_push_notifications.sql` añade
`push_notification_attempted_at`. La Edge Function autenticada
`send-space-invitation-push` valida que quien llama creó esa invitación y una
función reservada a `service_role` reclama un único intento antes de resolver
los dispositivos del destinatario. El push no concede acceso ni sustituye la
consulta in-app.

### 6.4.1 Un espacio juntos por usuario

`space_members` tiene una columna `space_type` (copiada una sola vez de
`spaces.type` al crear la membresía, inmutable) y un índice único parcial
`space_members_one_active_couple_per_user_idx` sobre
`(user_id) where status='active' and space_type='couple'`. Es la aplicación
real de "un usuario no puede tener dos espacios juntos activos a la vez": no
es solo una comprobación de aplicación (que dejaría una condición de carrera
entre dos aceptaciones concurrentes), sino una restricción de base de datos,
igual que `spaces_one_active_personal_per_user_idx` ya resuelve el caso
análogo para espacios personales. `create_couple_space()` y
`accept_space_invitation()` hacen una comprobación amigable primero y
capturan `unique_violation` como respaldo.

Al aceptar una invitación, ambas personas quedan con `role = 'owner'`
(anfitriones simétricos, sin jerarquía dueño/miembro) — no se introdujo un
nuevo valor de `role` para esto.

Una invitación nueva para alguien que ya tuvo una membresía en el mismo
espacio la reactiva: conserva la fila, vuelve `status` a `'active'`, limpia
`left_at` y actualiza `joined_at`. La unicidad `(space_id, user_id)` evita
duplicar a esa persona al volver.

Un espacio juntos nace **pendiente**: `create_couple_space()` inserta
`activated_at = null` y son `accept_space_invitation()` y
`accept_current_user_space_invitation()` las que lo activan
(`activated_at = coalesce(activated_at, now())`). Un espacio de una sola
persona no es un espacio (ADR-078): quien invita es miembro activo para poder
leerlo y gestionarlo, pero Inicio muestra `AwaitingPartnerScreen` en vez del
balance y la app no sincroniza nada contra él. El cupo de §6.4.1 se consume
igualmente mientras la invitación esté viva, para que nadie acumule
invitaciones abiertas en paralelo.

### 6.4.2 Salir de un espacio juntos

`leave_couple_space(p_space_id)` es la única operación de salida. Valida que
quien llama sea miembro activo, cambia exclusivamente su membresía a `'left'`
y revoca su acceso mediante RLS; no toca la membresía de la otra persona ni
archiva el espacio. Si todavía queda una membresía activa, el espacio y sus
datos permanecen disponibles para ella y quien salió puede volver con una
nueva invitación.

Si la salida deja cero miembros activos —incluido cancelar un espacio pendiente
antes de que acepten—, la función elimina transaccionalmente el espacio y sus
datos dependientes. Bloquea la fila de `spaces` antes de contar miembros, de
modo que dos salidas simultáneas no dejen un espacio huérfano: la segunda ve la
primera confirmada y ejecuta esa limpieza final.

### 6.4.3 Autoría y baja de cuenta

Toda columna que apunte a `auth.users(id)` desde una tabla cuyo contenido
puede sobrevivir a la baja de su autor **debe** ser nulable y declararse
`on delete set null`. Una FK `not null` sin acción `on delete` hace fallar
`auth.admin.deleteUser()` con violación de clave foránea y deja la cuenta a
medio eliminar. Cumplen la regla `spaces`, `categories`,
`recurring_transaction_series` y `transactions` (migración 06), y
`transaction_notification_rules` y `category_budgets` (migración 21).

Las tablas indexadas por algo que no sea `auth.users(id)` no las alcanza
ninguna FK y hay que borrarlas a mano dentro de `request_account_deletion()`:
hoy es el caso de `login_attempts`, que guarda el email.

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

### 6.5.1 `money_accounts`

Campos:

```text
id                     uuid, PK
space_id               uuid, FK
name                   text
kind                   text (cash | bank | card)
icon                   text
color_token            text
currency               text
opening_balance_minor  bigint, admite cero y negativos
created_by             uuid nullable
source_installation_id text
source_local_id        text
is_archived            boolean
created_at             timestamptz
updated_at             timestamptz
archived_at            timestamptz nullable
```

Reglas:

- La cuenta pertenece a un espacio, igual que la categoría: ambos miembros la
  ven y solo su autor la edita o archiva.
- Una cuenta puede guardar varias monedas (`money_account_balances`), cada una
  con su saldo. Nunca se suman entre sí: un total mezclando divisas no
  significaría nada mientras no exista conversión.
- Un movimiento solo puede asignarse a una cuenta que guarde su misma moneda.
- Una cuenta nueva comienza con la moneda principal del espacio. Al asignarle
  el primer movimiento de otra moneda, se añade un saldo para esa divisa con
  saldo inicial cero; las monedas y saldos que ya tienen movimientos no se
  reescriben ni se eliminan.
- El saldo es saldo inicial más ingresos menos gastos asignados, con la misma
  regla de horizonte mensual que el resto de la app (§8).
- El tipo solo propone icono y color al crear la cuenta; los tres se comportan
  igual. La migración 31 dejó el CHECK en `cash`, `bank` y `card`.
- Eliminar una cuenta es archivarla; sus movimientos se conservan.
- `transactions.money_account_id` y su equivalente en las series son opcionales
  y usan la foránea compuesta `(money_account_id, space_id)`: con `match
  simple` no se evalúa cuando la columna es nula, así que protege el caso que
  importa —asignar la cuenta de otro espacio— sin estorbar al movimiento sin
  cuenta.
- La importación bancaria no asigna cuenta todavía.

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

Preparada en migración (`04_transaction_notification_rules.sql`),
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

### 6.11 Reglas e importaciones bancarias

La migración `10_import_learning_system.sql` añade tres tablas, todas con RLS:

- `user_merchant_rules`: aprendizaje personal, único por usuario, espacio y
  comercio normalizado. La categoría usa una FK compuesta que obliga a que
  pertenezca al mismo espacio.
- `import_batches`: metadatos mínimos de una revisión, sin conservar el
  archivo bancario original.
- `import_items`: filas normalizadas pendientes o ya importadas; conserva
  solo datos de revisión y enlaza categoría y movimientos mediante FKs del
  mismo espacio.

Las reglas personales se sincronizan tras la migración autenticada de los
espacios y categorías. El RPC `sync_import_merchant_rules` recibe IDs locales
de espacio y categoría, los resuelve mediante los mapas de la migración de
invitado y hace un upsert protegido: el cliente nunca puede enviar un UUID
remoto arbitrario. Una actualización retrasada no puede sobrescribir una
corrección más nueva.

Los batches e ítems se sincronizan tras las reglas personales mediante
`sync_import_batches`. El RPC conserva los datos normalizados de revisión,
incluida la selección local, resuelve categorías y duplicados con los mapas
locales ya migrados y rechaza UUIDs remotos arbitrarios. El commit definitivo
de movimientos continúa siendo un RPC separado e idempotente de la fase de
commit.

La migración `11_community_merchant_feedback.sql` separa estrictamente el
aprendizaje comunitario de las reglas personales: `merchant_feedback_votes`
solo guarda el voto actual privado de una cuenta, mientras los agregados y
candidatos se actualizan exclusivamente mediante
`record_merchant_feedback(import_item_id, canonical_category_key)`. No se
guardan importes, fechas, textos crudos ni cuentas, y ningún candidato se
publica automáticamente. La cola local `merchant_feedback_queue` (versión 15
de SQLite) solo encola un voto una vez que el `import_item` correspondiente
ya está sincronizado con su categoría final; nunca antes.

La migración `12_fix_import_batches_source_type.sql` corrige un
`source_type` que aceptaba `'tsv'` sin que el cliente pudiera producirlo
nunca (auditoría del 2026-08-09). La migración
`13_import_batches_file_hash_sync.sql` conecta la columna `file_hash`
—preparada desde la migración 10 pero sin usar— al RPC `sync_import_batches`:
si el hash entrante choca con un batch distinto del mismo usuario y espacio,
el RPC lo guarda como `null` en vez de fallar, para no bloquear
permanentemente a alguien que confirma reimportar el mismo archivo a
propósito.

La migración `14_import_batches_pdf_source_type.sql`, que añadía `'pdf'` al
CHECK de `source_type` (ADR-071), se eliminó por completo (ADR-073): PDF se
descartó del todo, así que `source_type` quedó tal como lo dejó la migración
12, sin necesidad de ninguna migración de reversión adicional.

### 6.12 `login_attempts`

Migración `15_login_attempts_lockout.sql` (ADR-075). Bloqueo temporal tras
intentos fallidos de inicio de sesión.

```text
email             text, PK (normalizado a minúsculas)
failed_count      integer, default 0
locked_until      timestamptz nullable
last_attempt_at   timestamptz
```

Reglas:

- RLS activado sin ninguna política: ni `anon` ni `authenticated` pueden
  leer ni escribir esta tabla desde el cliente (`revoke all ... from anon,
  authenticated`). Solo la Edge Function `login-with-lockout` la toca, con
  la service role key.
- No existe una función RPC pública para consultar o incrementar el
  contador: el conteo solo es confiable si se actualiza en el mismo paso
  que la validación real de la contraseña contra GoTrue, y esa validación
  no ocurre en Postgres. Una función `SECURITY DEFINER` invocable desde el
  cliente permitiría a cualquiera incrementar el contador de un correo
  ajeno sin intentar iniciar sesión de verdad (un bloqueo como ataque de
  denegación de servicio), así que ese camino se descartó a propósito.
- A los 9 intentos fallidos consecutivos para un mismo correo, se bloquea
  1 hora (`locked_until = now() + interval '1 hour'`) y el contador vuelve
  a 0. Un bloqueo vencido se limpia en el siguiente intento en vez de
  arrastrar el contador anterior.
- Un inicio de sesión correcto borra la fila del correo.

### 6.13 `user_push_tokens`

Migración `36_invitation_push_notifications.sql`. Dispositivos autenticados a
los que se pueden enviar avisos de invitaciones mediante Expo Push Service.

```text
expo_push_token    text, PK
user_id            uuid, FK auth.users (on delete cascade)
platform           text ('ios' | 'android')
created_at         timestamptz
updated_at         timestamptz
```

Reglas:

- RLS está activado sin políticas y `anon`/`authenticated` no tienen permisos
  directos sobre la tabla. Un usuario solo registra o retira el token de su
  sesión mediante RPC `SECURITY DEFINER`.
- Registrar un token ya conocido mueve su asociación a la sesión actual. Esto
  evita que un dispositivo compartido conserve la cuenta anterior.
- El cierre de sesión intenta retirar el token antes de borrar el JWT. Borrar
  la cuenta elimina sus tokens por cascada.
- Solo `service_role` puede leer tokens y reclamar el envío de una invitación.
- El payload de invitación es deliberadamente genérico: no contiene nombres de
  miembros, nombre del espacio ni información financiera.

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

Implementado en la migración 24. `profiles_select_own` sigue vigente y la
política nueva, `profiles_select_space_member`, se suma con OR: autoriza leer
el perfil de quien tenga una membresía **activa** en un espacio donde el lector
también la tenga. Una membresía pendiente no abre nada, así que una invitación
sin aceptar no filtra el nombre de quien la recibió.

Se apoya en `public.shares_active_space_with(uuid)`, que es `security definer`
por necesidad y no por rendimiento: sin ese modo, la subconsulta sobre
`space_members` volvería a evaluar `members_select_member`, que consulta esa
misma tabla. Es el mismo recurso que ya usa `is_active_space_member`.

Límite conocido: RLS es por fila, no por columna, así que la otra persona ve
también `locale` y `default_currency`. Son preferencias, no credenciales, y
ambos miembros ya comparten los importes del espacio. Restringir columnas
exigiría una vista aparte.

La foto de perfil sigue exactamente la misma regla. El bucket `avatars`
(migración 25) es privado y sus políticas sobre `storage.objects` son
`avatars_write_own`, que limita la escritura a la carpeta cuyo nombre coincide
con el uuid de quien escribe, y `avatars_select_space_member`, que reutiliza
`shares_active_space_with`. Una invitación sin aceptar no da acceso a la foto,
igual que no lo da al nombre. El bucket rechaza además cualquier objeto de más
de 256 KiB o que no sea `image/jpeg`, como cinturón de seguridad frente a un
cliente defectuoso.

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

### 9.5.1 Cuentas

Misma tríada que categorías (migración 28): `money_accounts_select_member` lee
con membresía activa, `money_accounts_insert_author` y
`money_accounts_update_author` exigen además ser el autor. No hay política de
borrado porque eliminar es archivar.

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

### Sincronización activa de espacios Juntos

ADR-076 habilita una excepción acotada a los espacios `type = 'couple'`:

- Al crear, editar o archivar una categoría, gasto, ingreso o recurrencia en
  Juntos, SQLite conserva primero la intención local y `sync_couple_space_data`
  la publica después dentro de una única transacción de PostgreSQL.
- Para categorías, series y movimientos nuevos, el RPC conserva el UUID creado
  por SQLite como identificador remoto. Así el dispositivo creador y el resto
  de miembros materializan la misma entidad; los identificadores locales
  heredados que no sean UUID conservan el fallback remoto generado por
  PostgreSQL.
- El RPC exige una membresía activa en ese espacio y resuelve las categorías y
  series antes de sus movimientos; ningún cliente puede escribir en un espacio
  ajeno ni construir una dependencia cruzada por su cuenta.
- La migración 19 publica categorías, series y movimientos en
  `supabase_realtime`. La otra instalación se suscribe al espacio activo y
  recupera el snapshot al recibir el evento; volver a primer plano y el sondeo
  cada 15 segundos permanecen como respaldo. Una fila local pendiente nunca se
  sobrescribe durante esa recuperación.
- Para esta primera versión, dos ediciones offline sobre el mismo campo usan
  última escritura confirmada; no hay historial ni resolución manual todavía.

Las notas libres, recordatorios y reglas de notificación siguen siendo locales:
el esquema remoto actual no los modela y no forman parte de esta garantía.

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
- `money_accounts(space_id, is_archived, name)`
- `transactions(money_account_id, is_archived, occurred_on desc)` parcial, solo
  cuando la cuenta no es nula
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

La política ya resuelta para los espacios compartidos vive en ADR-084: cerrar
sesión no borra su caché SQLite —podría contener trabajo offline todavía
pendiente—, pero `useSpaces` deja de exponer de forma síncrona cualquier espacio
`couple` cuando no existe una sesión. El invitado cae a su espacio Personal y no
puede seleccionar ni consultar la caché compartida desde la aplicación. Al
autenticarse de nuevo, el refresco remoto reconcilia el catálogo y RLS vuelve a
validar la membresía en cada operación de Supabase.

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
2. Política de salida de espacios de pareja. Resuelta por ADR-083: una salida
   solo desactiva la membresía propia, permite reincorporarse por invitación y
   elimina el espacio únicamente tras la última salida. Siguen sin definir
   exportación, copia automática de categorías y auditoría de salidas.
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
