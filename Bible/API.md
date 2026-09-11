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
- El estado de cuenta se lee con `GET /v1/me`. Si `data.profile.countryCode`
  está presente, el cliente lo guarda en `local_profile` antes de restaurar el
  snapshot para que las capacidades monetarias estén disponibles desde el
  primer render.
- La restauración remota usa `GET /v1/sync/snapshot`.
- La restauración resuelve la identidad con `getAuthenticatedUserId`: si la
  consulta de sesión pierde la conexión, reutiliza la sesión en memoria. Una
  respuesta explícita sin sesión o con 401 sigue impidiendo restaurar. El
  snapshot siempre se solicita al backend con la cookie y sus permisos vigentes.
- Los cortes de red al enviar o leer una respuesta se normalizan como
  `ApiError` con `code: NETWORK_ERROR`, `status: 0` y el endpoint afectado.
  No equivalen a un 401 ni disparan reenvíos automáticos de escrituras.
- El cliente comparte la inicialización y el snapshot que ya están en curso
  para una misma sesión. Ante un error recuperable no descarta la caché local
  ni reintenta automáticamente: expone una acción explícita de reintento.
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
  Better Auth. `authClient.getSession()` es una petición de red sin caché, así
  que un corte la resuelve igual que una sesión ausente; el cliente cae
  entonces a la sesión que `useSession()` conserva en memoria, que es la misma
  sesión verificada y solo se vacía ante un `401`. Sin esa caída, una conexión
  inestable convertía a una persona conectada en anónima y detenía sus subidas.

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
