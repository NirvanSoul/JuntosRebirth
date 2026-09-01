# API.md

## Servicio remoto activo

La aplicación usa exclusivamente Juntoss API:

```text
https://juntosapi.aora-estudio-o.workers.dev
```

La autenticación se integra con Better Auth para Expo en `/api/auth` mediante
`src/lib/auth-client.ts`; no se implementan llamadas HTTP de autenticación a
mano. Apple Sign In no está disponible.

## Sesión y restauración

- Tras registro con OTP válido o inicio de sesión: `POST /v1/bootstrap` con `{ timezone }`,
  una zona IANA como `Europe/Madrid`.
- El estado de cuenta se lee con `GET /v1/me`.
- La restauración remota usa `GET /v1/sync/snapshot`.
- La sincronización de un espacio usa `POST /v1/spaces/:spaceId/sync` e
  incluye siempre categorías, cuentas, recurrencias y transacciones.
- Al cerrar sesión, la aplicación vuelve al acceso autenticado y oculta la
  caché local financiera. Una caché heredada sin propietario se descarta antes
  de restaurar una cuenta.

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

## Límites de integración

La API es la autoridad de permisos y datos remotos. Una sesión no verificada
debe recibir `403 EMAIL_NOT_VERIFIED` y no puede leer ni escribir datos. No se
usa Supabase ni SQL versionado dentro de este repositorio.

Los contratos completos se mantienen en el repositorio de la API:
<https://github.com/NirvanSoul/JuntosRebirthAPI>.
