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
- El mismo refresco periódico actualiza el censo de los espacios compartidos
  mediante `GET /v1/spaces/:spaceId/members`. Los cambios de nombre y de foto
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
- El cliente comparte la inicialización y el snapshot que ya están en curso
  para una misma sesión. Ante un error recuperable no descarta la caché local
  ni reintenta a ciegas: muestra un aviso no bloqueante (`NoticeToast`) con
  la acción explícita de reintento sobre la caché ya visible. Un fallo de
  red (`NETWORK_ERROR`) se distingue como "sin conexión" y, además del
  botón, se reintenta una vez al recuperar la red (`expo-network`). Un `401`
  cierra sesión sin aviso adicional (`classifySyncFailure`).
- La sincronización de un espacio usa `POST /v1/spaces/:spaceId/sync` e
  incluye siempre categorías, cuentas, recurrencias y transacciones.
- Al cerrar sesión, la aplicación vuelve al acceso autenticado, oculta la
  caché local financiera y la descarta.
- Al iniciar sesión, la caché local **se conserva salvo prueba de que pertenece
  a otra cuenta**. `local_sync_account` guarda el propietario declarado; en los
  dispositivos anteriores a ese marcador, un enlace de `remote_entity_links` con
  otro `user_id` sirve de prueba. Sin ninguna de las dos, la caché se adopta:
  puede ser trabajo sin conexión que todavía no llegó a subirse, y descartarlo
  lo perdería para siempre.
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

Los contratos completos se mantienen en el repositorio de la API:
<https://github.com/NirvanSoul/JuntosRebirthAPI>.
