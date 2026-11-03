# API.md

## Servicio remoto activo

La aplicación usa exclusivamente Juntoss API:

```text
https://api.aoraestudio.com
```

Es el dominio propio del Worker, el mismo que declara `EXPO_PUBLIC_API_URL`.
`juntosapi.aora-estudio-o.workers.dev` sigue respondiendo, pero no es la
dirección que usa la aplicación.

La autenticación se integra con Better Auth para Expo en `/api/auth` mediante
`src/lib/auth-client.ts`; no se implementan llamadas HTTP de autenticación a
mano. Apple Sign In no está disponible.

Google Sign-In nativo solicita el ID token con el cliente OAuth de tipo Web
declarado en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Ese identificador debe
coincidir con `GOOGLE_CLIENT_ID` en Better Auth. El cliente OAuth de iOS se
mantiene separado, y Android autoriza cada firma mediante un cliente propio de
tipo Android con el package `com.juntosapp.finance` y su SHA-1 correspondiente.
El cliente distingue una cancelación, Google Play Services no disponible, los
rechazos `SOCIAL_ACCOUNT_NOT_LINKED` e `INVALID_SOCIAL_TOKEN` del servidor y el
`DEVELOPER_ERROR` 10 de Android. Este último se
presenta como una instalación no autorizada y se registra solo con etapa y
código, nunca con el correo ni el ID token. Si Better Auth acepta el token pero
la sesión no se hidrata en 15 segundos, el botón vuelve a habilitarse para
permitir un reintento.

## Sesión y restauración

- Tras registro con OTP válido o inicio de sesión: `POST /v1/bootstrap` con `{ timezone }`,
  una zona IANA como `Europe/Madrid`.
- El estado de cuenta se lee con `GET /v1/me`. `data.profile` incluye el nombre
  y la metadata vigente del avatar (`avatarPath` y `avatarUpdatedAt`), además
  del país. El cliente los restaura en `local_profile` al iniciar sesión y en
  cada refresco periódico, también cuando solo existe el espacio personal. Una
  edición local pendiente tiene prioridad hasta que se publica; después, el
  perfil remoto vuelve a ser la fuente canónica para todos los dispositivos.
- La restauración remota inicial usa `GET /v1/sync/snapshot`. Las revisiones de
  importación (`GET /v1/sync/import-reviews`) se piden a la vez que el snapshot;
  se escriben después, sobre los espacios ya restaurados. Al restaurar, los
  enlaces remoto→local de `remote_entity_links` se leen de una vez por tipo y
  se escriben sin releerse: un enlace existente conserva su id local.
  Tras la inicialización o al haber cursor previo guardado en `local_sync_cursor`,
  los refrescos periódicos usan `GET /v1/sync/changes?since=...` para descargar
  únicamente las modificaciones incrementales sin transferir colecciones completas.
  Un movimiento que vuelve con el mismo `updatedAt` que su fila local ya
  sincronizada es el eco de la subida propia (el backend guarda el `updatedAt`
  recibido) y no provoca una recarga de la caché.
- Un refresco periódico de cada 30 s (no cada tick de 2 s del delta; las
  acciones explícitas lo hacen siempre) restaura el perfil propio con
  `GET /v1/me` y actualiza el censo de los espacios compartidos mediante
  `GET /v1/spaces/:spaceId/members`. Un censo o un perfil sin cambios no se
  reescriben en SQLite ni se publican a la interfaz. Los cambios de nombre y de foto
  actualizan la caché local y se publican a la interfaz activa sin remontar la
  navegación; las fotos solo se descargan cuando cambia `avatarUpdatedAt`. Un
  nombre propio cuya publicación falla queda pendiente y se reintenta en ese
  mismo ciclo de refresco.
- La restauración resuelve la identidad con `getAuthenticatedUserId`: si la
  consulta de sesión pierde la conexión, reutiliza la sesión en memoria. Una
  respuesta explícita sin sesión o con 401 sigue impidiendo restaurar. El
  snapshot y los deltas siempre se solicitan al backend con la cookie y sus permisos vigentes.
- Los cortes de red al enviar o leer una respuesta se normalizan como
  `ApiError` con `code: NETWORK_ERROR`, `status: 0` y el endpoint afectado.
  No equivalen a un 401 ni disparan reenvíos automáticos de escrituras.
  Una petición que no recibe respuesta en 30 s (120 s si sube bytes, como el
  avatar) se aborta y se normaliza igual.
- El cliente comparte la inicialización y el snapshot que ya están en curso
  para una misma sesión. Ante un error recuperable no descarta la caché local
  ni reintenta a ciegas: muestra un aviso no bloqueante (`NoticeToast`) con
  la acción explícita de reintento sobre la caché ya visible. Un fallo de
  red (`NETWORK_ERROR`) se distingue como "sin conexión" y, además del
  botón, se reintenta una vez al recuperar la red (`expo-network`). Un `401`
  cierra sesión sin aviso adicional (`classifySyncFailure`). El refresco
  periódico solo se habilita después de que esa inicialización completa termine
  correctamente; un lote rechazado con `400` conserva el snapshot restaurado y
  espera el reintento explícito en vez de repetir la misma escritura.
- La sincronización de un espacio usa `POST /v1/spaces/:spaceId/sync` e
  incluye siempre categorías, cuentas, recurrencias y transacciones.
- **Conflictos (contrato de `Juntos API`, nota del 2026-11-02 en
  `patch/APP.md`; implementado en la API sin desplegar).** La respuesta
  puede incluir `data.conflicts: { collection, localId, remoteId, reason,
  serverUpdatedAt }[]`, solo si alguna versión enviada no se aplicó, y cada
  `data.transactions[]` lleva `applied`. Con `applied: false` sus valores son
  los canónicos (o `null`), y el cliente no los guarda sobre la fila local.
  Ante un `NEWER_VERSION` el cliente borra el cursor incremental antes de
  marcar las filas, para que la siguiente restauración sea un snapshot
  completo aunque un delta concurrente ya hubiera saltado la versión
  canónica. Cada borrado incrementa una generación en memoria por cuenta; una
  restauración la anota antes de pedir datos y no escribe su cursor si cambió,
  así una restauración en vuelo no deshace el borrado. Tras marcar las filas
  se borra otra vez, por si una restauración empezó entre ambos pasos.
  - `NEWER_VERSION`: la fila se marca `synced` solo si su `updatedAt` no
    cambió durante el envío, para que la versión canónica la sustituya; un
    cambio posterior sigue pendiente.
  - `NOT_IN_SPACE`: no se guardó en ninguna parte, así que la fila no se
    marca `synced` y sigue contando como pendiente. No borra el cursor: el
    servidor no republica nada.
  - Una API que omite `conflicts` y `applied` (la desplegada, `origin/main`
    b67e68e) mantiene el comportamiento anterior: toda fila enviada con
    respuesta correcta se marca sincronizada. Converge igualmente, porque la
    API nueva republica la versión canónica por `/v1/sync/changes`.
- La restauración (snapshot o delta) comprueba que `local_sync_account` es
  la cuenta que restaura, antes de escribir y de nuevo dentro de la
  transacción exclusiva: una respuesta tardía de una sesión anterior nunca se
  escribe en la caché que otra cuenta reclamó.
- Al restaurar (snapshot o delta), una fila local que no está `synced` no se
  sobrescribe y **tampoco sus hijos**: los saldos de una cuenta y los
  presupuestos de una categoría pendientes sobreviven en todas sus monedas.
- Al cerrar sesión, la aplicación vuelve al acceso autenticado, oculta la
  caché local financiera y la descarta. Antes cuenta los cambios sin
  confirmar por el servidor (categorías, cuentas, recurrencias, movimientos,
  nombre y foto de perfil). Si los hay, ofrece «Subir y cerrar sesión», que
  reutiliza la subida idempotente de cada espacio; si algo sigue sin subir (sin
  red, rechazo del servidor) o no se pudo contar, explica que se borrará del
  dispositivo sin recuperación y solo cierra si la persona lo confirma. Las
  importaciones sin terminar y las configuraciones de recordatorios no tienen
  subida: no se cuentan como pendientes, pero cada aviso de cierre (también
  el del reinicio del onboarding) nombra cuántas se borrarán.
- Al iniciar sesión, la caché local solo se muestra o se sube **con evidencia
  de que es de quien entra** (`classifyLocalCacheOwnership`): el propietario
  declarado en `local_sync_account`, enlaces de `remote_entity_links` solo de
  esta cuenta, la marca que deja el onboarding sobre una caché vacía (sus datos
  se asocian a la primera sesión) o una caché sin datos de cuenta.
  - Un propietario u enlace de otra cuenta prueba que es ajena: se borra.
  - Sin propietario ni enlaces pero con datos, no se puede atribuir: se
    **aparta sin borrarla** a `juntoss-unattributed-<marca>.db` (copia con
    `backupDatabaseAsync`, verificada con `PRAGMA quick_check` antes de borrar
    el original) y el catálogo de espacios a una clave
    `….unattributed.<marca>`. La app nunca abre ni sube esas copias; su
    recuperación queda pendiente de una decisión de producto.
  - Si borrar o apartar falla, el error se propaga como
    `LocalCacheIsolationError`: `getLocalDatabase` deja de entregar la base,
    la app muestra un estado bloqueado con «Reintentar» y el reintento repite
    la misma limpieza (nunca convierte un aislamiento en borrado). Una base
    inexistente cuenta como limpia. Si el fallo persiste, «Cerrar sesión»
    cierra solo la sesión, sin borrar nada. La limpieza pendiente recuerda
    qué cuenta la provocó: si entra otra, se descarta y la caché se vuelve a
    clasificar (podría ser de quien entra). Mientras tanto el catálogo de
    espacios se aparta en `….pendingDiscard` en vez de borrarse: vuelve si la
    caché resulta ser de quien entra y se borra si la caché se borra. La que decidió quien cerró sesión
    se repite con cualquier cuenta. Un reintento que termina una limpieza se
    informa como `discarded` o `quarantined`, no como `kept`.
  - Tras borrar o apartar la caché se releen espacios, monedas y perfil
    propio antes de mostrar nada: lo leído al montar podía ser de la cuenta
    anterior, y el snapshot puede fallar.
  - Sin identidad no se atribuye, no se muestra y no se borra.
  - Cada subida comprueba además que `local_sync_account` coincide con la
    sesión que firma (`assertLocalCacheOwnedBy`).
- Esa adopción no mezcla contextos monetarios incompatibles. Si el perfil remoto
  es VE y el espacio provisional `personal` contiene movimientos pendientes en
  una moneda distinta de USD/VES, el snapshot usa el UUID remoto como espacio
  local y deja el provisional aislado, sin borrarlo ni subirlo a Venezuela. Un
  enlace VE→`personal` creado por un intento anterior se repara del mismo modo.
  Al restaurar el perfil VE también se sustituyen preferencias heredadas de otra
  sesión por USD/VES antes de permitir nuevas entradas.
- Por eso la sincronización de inicio de sesión sí incluye las filas
  `local_only`: son las creadas sin conexión y su única vía de subida.
  `GET /v1/sync/snapshot` solo sobrescribe filas locales en `synced`, así que lo
  pendiente de subir sobrevive a la restauración.
- La identidad que firma las escrituras locales sale siempre de la sesión de
  Better Auth. Primero se lee la que `useSession()` conserva en memoria —tanto
  la respuesta ya resuelta como la copia que el cliente Expo hidrata desde
  SecureStore mientras `/get-session` sigue en vuelo— siempre que esté
  verificada, no haya caducado y no tenga error; así el arranque no gasta una
  petición de red por cada paso de la inicialización. Si esa lectura no vale,
  `authClient.getSession()` consulta al servidor: un corte la resuelve igual
  que una sesión ausente y el cliente cae entonces a la sesión en memoria,
  que solo se vacía ante un `401`. Sin esa caída, una conexión inestable
  convertía a una persona conectada en anónima y detenía sus subidas.
- Al abrir la app con sesión, la caché local que pertenece a la cuenta se
  muestra antes de `POST /v1/bootstrap`; el snapshot y la subida de pendientes
  la actualizan en segundo plano. Ver `ARCHITECTURE.md` §4.
- El `activatedAt` de cada espacio del snapshot es la fuente de "esperando
  pareja" (`isAwaitingPartner`), igual que en `GET /v1/spaces`. Las
  escrituras del catálogo local de espacios se serializan en el repositorio y
  toda fusión con datos remotos parte de lo guardado en ese instante
  (`updateSpaces`), no de una copia en memoria: así la comprobación del
  espacio de pareja y la restauración del snapshot, que arrancan a la vez,
  no se pisan. La restauración completa solo reemplaza ese catálogo después de
  que la transacción SQLite con categorías, cuentas, recurrencias y movimientos
  haya terminado correctamente; si SQLite rechaza el snapshot, conserva tanto
  el catálogo como el espacio activo anteriores y deja que el flujo global
  muestre el error recuperable con su acción de reintento. El repositorio
  publica cada escritura confirmada al contexto activo, incluso cuando la
  inicia la sincronización fuera del selector. Si una versión anterior dejó un
  `activeSpaceId` que ya no pertenece al catálogo, la lectura cae al espacio
  personal y persiste esa reparación antes de admitir nuevas selecciones. Las
  acciones que esperan una respuesta remota fusionan su resultado sobre el
  catálogo persistido más reciente; nunca vuelven a guardar la copia capturada
  antes de esa espera.

Las rutas `/v1/*` requieren sesión de Better Auth con correo verificado. Las respuestas correctas
envuelven su contenido en `data`; los errores usan `error.code` y
`error.message`. Los importes son strings de enteros en unidades menores, nunca
floats.

El registro por correo ya genera el OTP en el servidor (`sendVerificationOnSignUp`).
El cliente no debe solicitar un segundo código inmediatamente después de crear
la cuenta: solo puede usar el reenvío explícito desde la pantalla OTP.

La recuperación comprueba el OTP con `checkVerificationOtp` y
`type: "forget-password"`; no usa `verifyEmail`. El cambio de contraseña vuelve
a enviar a `resetPassword` el mismo correo y OTP. Ambos pasos comparten los tres
intentos permitidos por el servidor. La interfaz conserva y muestra el código
estable de los errores de autenticación —en particular `INVALID_OTP`,
`OTP_EXPIRED` y `TOO_MANY_ATTEMPTS`— junto a un mensaje específico en español.

Iniciar sesión con un correo sin verificar es distinto: la API responde
`403 EMAIL_NOT_VERIFIED` y **no** envía ningún código. El cliente pide uno con
`emailOtp.sendVerificationOtp` antes de abrir la pantalla OTP, que cuenta su
cooldown de reenvío dando por hecho que ya salió un código.

Para proteger el acceso por contraseña, el servidor permite hasta 15 intentos
fallidos consecutivos por correo. Al alcanzar ese límite bloquea el acceso por
**cinco minutos reales** y devuelve `429 TOO_MANY_ATTEMPTS` con `lockedUntil`;
el cliente muestra ese periodo a la persona. Un acceso correcto borra el
contador.

`DELETE /v1/me` elimina la cuenta y sus datos. El cliente debe enviar el
cuerpo `{ confirmation: "DELETE_MY_ACCOUNT" }`; sin esa confirmación el
servidor rechaza la operación.

`DELETE /v1/me/data` elimina los datos financieros y de perfil de la cuenta,
incluido su avatar y cachés de sincronización remotas, pero conserva las
credenciales. Revoca todas las sesiones; el cliente elimina su caché local y
vuelve a Acceso. Los datos de otra persona en un espacio compartido no se
eliminan.

## Espacio de pareja

Crear un espacio compartido son dos peticiones, no una transacción:
`POST /v1/spaces` y `POST /v1/spaces/:spaceId/invitations`. Si la segunda
falla, el espacio ya existe y el servidor solo admite un espacio de pareja
activo por persona, así que el cliente reutiliza el que quedó esperando pareja
en lugar de crear otro, que sería rechazado con `COUPLE_SPACE_LIMIT`.
La regla se aplica a toda membresía activa, tanto de quien creó el espacio como
de quien entró mediante invitación. PostgreSQL la serializa por usuario y la
comprueba dentro de la escritura de membresía; por eso dos creaciones o
aceptaciones simultáneas tampoco pueden producir dos espacios. El cliente hace
una comprobación previa solo para dar respuesta inmediata, pero no es la
autoridad de esta regla.

La persona propietaria puede cancelar una invitación aún pendiente con
`DELETE /v1/spaces/:spaceId/invitations/:invitationId`. Esta operación la
revoca y conserva el espacio en espera, para poder enviar una nueva invitación;
no debe usar `POST /v1/spaces/:spaceId/members/leave`, que exige transferir la
propiedad cuando el espacio ya tiene propietario.

La persona invitada puede rechazar o cancelar una invitación entrante pendiente
mediante `POST /v1/invitations/:invitationId/reject`. Esta operación notifica
en el backend a la persona que emitió la invitación.

Ambas peticiones envían la zona IANA del dispositivo, igual que
`POST /v1/bootstrap`.

## Tasas de Venezuela

Las tasas públicas de Venezuela viven bajo `/v1/exchange`:

- `GET /v1/exchange/rates` devuelve las tasas `BCV` (USD/VES) y `EURO`
  (EUR/VES), su fecha de observación, su fecha de captura y `stale` si el
  servidor tuvo que usar el último snapshot conocido.
  La app reutiliza la última respuesta durante 5 minutos y comparte la
  petición en curso, de modo que las hojas que muestran tasas abren con ellas
  sin estado de carga (las tasas ficticias del usuario demo no se cachean).
- `POST /v1/exchange/preview` recibe `{ countryCode: 'VE', amount, currency }`.
  `amount` es un string decimal en unidades mayores y `currency` es `USD` o
  `VES`; devuelve conversiones BCV y Euro. La frontera entre ese contrato y
  los enteros en unidades menores se concentra en
  `features/exchangeRates/gateways/juntossExchangeRateGateway.ts`.

Las tasas personalizadas requieren sesión y usan
`/v1/exchange/custom-rates`. El lote `POST /v1/spaces/:spaceId/sync` acepta
`customRateId` en un movimiento, pero nunca tasas ni snapshots enviados por el
cliente. Para movimientos de usuarios de Venezuela en USD o VES, el servidor
congela las tasas aplicables y responde `exchangeSnapshot` por movimiento.
`GET /v1/sync/snapshot` también devuelve ese snapshot. El cliente persiste y
lee esos valores históricos; no los recalcula con la tasa vigente.

## Límites de integración

La API es la autoridad de permisos y datos remotos. Una sesión no verificada
debe recibir `403 EMAIL_NOT_VERIFIED` y no puede leer ni escribir datos. No se
usa Supabase ni SQL versionado dentro de este repositorio.

El usuario demo de desarrollo (`ARCHITECTURE.md` §16.1) no existe en la API:
mientras está activo, `juntossApiClient` rechaza cualquier petición con
`ApiError` `DEMO_SESSION` sin llegar a enviarla. Las tasas de Venezuela
(`/v1/exchange/rates` y `/v1/exchange/preview`) se responden entonces con
valores ficticios locales.

Los contratos completos se mantienen en el repositorio de la API:
<https://github.com/NirvanSoul/JuntosRebirthAPI>.
