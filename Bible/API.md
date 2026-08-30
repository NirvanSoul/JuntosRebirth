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

- Tras registro o inicio de sesión: `POST /v1/bootstrap` con `{ timezone }`,
  una zona IANA como `Europe/Madrid`.
- El estado de cuenta se lee con `GET /v1/me`.
- La restauración remota usa `GET /v1/sync/snapshot`.
- La sincronización de un espacio usa `POST /v1/spaces/:spaceId/sync` e
  incluye siempre categorías, cuentas, recurrencias y transacciones.

Las rutas `/v1/*` requieren sesión de Better Auth. Las respuestas correctas
envuelven su contenido en `data`; los errores usan `error.code` y
`error.message`. Los importes son strings de enteros en unidades menores, nunca
floats.

## Límites de integración

La API es la autoridad de permisos y datos remotos. El modo invitado sigue
siendo local hasta su migración con `POST /v1/sync/guest-migration`. No se usa
Supabase ni SQL versionado dentro de este repositorio.

Los contratos completos se mantienen en el repositorio de la API:
<https://github.com/NirvanSoul/JuntosRebirthAPI>.
