# Plan frontend — autenticación obligatoria sin modo invitado

## Objetivo

La aplicación solo muestra información financiera cuando existe una sesión de
Better Auth válida con `emailVerified === true`. SQLite se conserva como
almacenamiento local y caché de una cuenta autenticada; no existirá un modo
invitado, ni datos visibles sin sesión, ni migración de invitado.

## Estado actual

Completado en el cliente: puerta estricta en `RootNavigator`, OTP durante el
registro, host de acceso a pantalla completa, retirada de UI/migración de
invitado, limpieza de caché heredada al iniciar sesión y pruebas de los flujos
de acceso. El onboarding queda fuera de la ruta de arranque actual.

Pendiente de la API: aplicar la misma regla de correo verificado en el
servidor, retirar sus rutas y datos de invitado, y validar el flujo en un
development build de iOS y Android. El detalle transferible está en
`BACKEND_AUTH_RESTRUCTURE_PLAN.md`.

## Invariantes de aceptación

- Sin sesión, con sesión caducada o con correo sin verificar: solo
  `AccessScreen`.
- Una sesión cuyo campo `emailVerified` falte tampoco autoriza la app.
- Solo una sesión verificada puede restaurar datos y montar las pestañas.
- Toda fila local visible pertenece al `userId` autenticado actual.
- El cierre de sesión bloquea de inmediato datos, pestañas y modales internos.

## Secuencia de implementación

### 1. Alinear la API

- [ ] Confirmar el plan de backend y el código estable `EMAIL_NOT_VERIFIED`.
- [ ] Confirmar que la API rechaza cualquier ruta privada de un usuario sin
  verificar. El cliente no sustituye esta protección.

### 2. Centralizar la puerta de acceso

- [ ] En `RootNavigator`, derivar `authenticated` exclusivamente de una
  sesión con `emailVerified === true`.
- [ ] Mientras se restaura la sesión, mostrar solo la carga raíz.
- [ ] Sin sesión verificada, montar solo `AccessScreen`.
- [ ] Con sesión verificada, restaurar la cuenta antes de montar
  `MainTabsNavigator`.
- [ ] Eliminar toda decisión basada en `OnboardingStatus.accessMode`.

### 3. Hacer obligatorio el OTP

- [ ] `signUp` navega explícitamente a `verify-signup`.
- [ ] Conservar/recuperar el correo de una verificación pendiente al remontar
  la pantalla.
- [ ] Tras OTP válido, refrescar Better Auth y esperar sesión verificada antes
  de bootstrap, restauración o pestañas.
- [ ] Ante OTP inválido, vencido o reenvío, permanecer en acceso.
- [ ] No limitar la longitud del código; permitir pegarlo completo.
- [ ] Cancelar o volver atrás nunca puede abrir la app.

### 4. Dejar un único host de autenticación

- [ ] Mantener `AccessScreen` a pantalla completa para registro, OTP, inicio,
  recuperación y nueva contraseña.
- [ ] Eliminar `AuthModal` y sus usos desde Ajustes, espacios y navegación.
- [ ] Asegurar que los callbacks de éxito solo se ejecutan con sesión
  verificada.

### 5. Retirar modo invitado

- [ ] Eliminar «Probar sin cuenta», `markGuestComplete`, `accessMode` y sus
  tipos, repositorios y pruebas.
- [ ] Retirar insignias, límites y textos de invitado.
- [ ] Eliminar migración/conversión de invitado y condiciones `if (!session)`
  que habiliten funciones internas.
- [ ] Revisar perfiles, autoría, espacios y notificaciones para eliminar ramas
  semánticas de invitado.

### 6. Mantener SQLite solo por usuario autenticado

- [ ] Añadir o confirmar un `userId` propietario en toda fila local visible.
- [ ] Abrir, consultar y sincronizar caché solo tras conocer una sesión
  verificada; filtrar siempre por su `userId`.
- [ ] Ejecutar una migración local que elimine filas heredadas sin propietario
  (antiguos datos de invitado) antes de habilitar consultas.
- [ ] Al cerrar sesión, limpiar estado en memoria y bloquear consultas.
- [ ] Si se conserva caché offline, aislarla por `userId`; nunca mezclarla ni
  mostrarla a otra cuenta. Si se borra, hacerlo solo tras confirmar sync.

### 7. Onboarding

- [ ] Decidir si el onboarding se conserva tras OTP o se elimina en otra
  entrega.
- [ ] Si permanece, sus resultados se guardan bajo el `userId` autenticado.
- [ ] Nunca puede crear ni mostrar datos sin sesión.

### 8. Pruebas y cierre

- [ ] Registro → OTP → sesión verificada → restauración → pestañas.
- [ ] Registro sin OTP, OTP inválido/vencido y reenvío: sin datos ni pestañas.
- [ ] Inicio, expiración, cierre y cambio de cuenta: sin filtración de SQLite.
- [ ] Migración local elimina datos heredados sin propietario.
- [ ] Actualizar `PRODUCT.md`, `ARCHITECTURE.md` y `API.md`.
- [ ] Ejecutar `npm run validate` y verificar en iOS/Android con development
  build.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Carrera de sesión provisional | Exigir `emailVerified === true` en raíz y API. |
| Datos de otra cuenta en SQLite | Propiedad obligatoria por `userId` y limpieza de memoria al cambiar sesión. |
| Datos antiguos visibles | Migración de borrado antes de cualquier consulta. |
| Trabajo offline perdido | Retener solo caché aislada por usuario o borrar únicamente tras sincronizar. |

## Ficha de tarea — mensajes precisos de inicio de sesión

### Clasificación

Mediana: toca la puerta de autenticación, el OTP y la restauración posterior.

### Objetivo

Distinguir credenciales incorrectas, correo sin verificar, bloqueo, conectividad,
fallo al crear sesión y fallo posterior al cargar datos. Una carga remota fallida
no puede decir que el inicio de sesión falló si Better Auth ya lo confirmó.

### Alcance

Gateway de Better Auth, `LoginScreen`, los dos hosts que presentan el login y
la inicialización de sesión autenticada.

### Fuera de alcance

No cambia contratos de la API, contraseñas, límites ni el diseño de las
pantallas.

### Reutilización

Se reutilizan `VerifyCodeScreen`, `AccessScreen` e `initializeAuthenticatedSession`.

### Investigación

Se verificó el contrato de Better Auth y la configuración pública de la API:
`EMAIL_NOT_VERIFIED` se devuelve antes de crear una sesión cuando el correo no
está confirmado.

### Riesgos

Un correo sin verificar debe llegar al OTP sin otorgar acceso. La caché heredada
se limpia únicamente después de que exista una sesión autenticada.

### Validación

Pruebas unitarias de gateway, login y host de acceso; `npm run validate`.
