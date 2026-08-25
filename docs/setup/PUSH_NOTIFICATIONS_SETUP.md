# Configuración de notificaciones push de invitaciones

El repositorio contiene el registro seguro de tokens, la migración 36 y la Edge
Function `send-space-invitation-push`. La entrega nativa también necesita un
proyecto Expo/EAS y credenciales de APNs/FCM que no deben guardarse en Git.

## 1. Proyecto y compilación nativa

1. Vincular la app a EAS con `eas init`. El comando añade
   `expo.extra.eas.projectId` a la configuración; `getExpoPushTokenAsync()` lo
   usa para atribuir el token al proyecto correcto.
2. Configurar credenciales FCM v1 para Android y APNs para iOS mediante
   `eas credentials` o durante la primera compilación EAS.
3. Crear e instalar una development build. El push remoto de
   `expo-notifications` no funciona en Expo Go para Android desde SDK 53.

Referencias oficiales:

- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/sending-notifications/

## 2. Supabase

Aplicar y desplegar en el mismo entorno:

```sh
supabase db push
supabase functions deploy send-space-invitation-push
```

La plataforma suministra `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` a la Edge Function. La service role nunca se añade
a variables `EXPO_PUBLIC_*` ni al cliente móvil.

## 3. Verificación en staging

1. Instalar la development build en dos dispositivos o simuladores compatibles.
2. Iniciar sesión con dos cuentas confirmadas y aceptar el permiso explicado de
   notificaciones en la cuenta receptora.
3. Enviar una invitación escribiendo su correo.
4. Confirmar que quien invita ve `¡Invitación enviada!`, que el otro dispositivo
   recibe el push y que al tocarlo abre Inicio con el banner para aceptar.
5. Repetir con la app receptora en primer plano, en segundo plano y cerrada.
6. Probar un correo sin cuenta: no debe crearse invitación y debe aparecer la
   indicación para descargar Juntoss y registrarse.
7. Cerrar sesión en el receptor y confirmar que el token deja de estar asociado
   a esa cuenta.

## 4. Operación

La función elimina tokens que Expo rechaza inmediatamente como
`DeviceNotRegistered`. Antes de producción debe añadirse una tarea que consulte
los receipts diferidos de Expo y retire también los tokens invalidados después
de la aceptación inicial del mensaje. La invitación in-app no depende de esos
receipts y permanece disponible si el push falla.
