# Configuración de correo con Resend

Este documento describe la configuración manual necesaria en el Dashboard de
Supabase y en Resend para que `juntoss` pueda enviar confirmaciones de cuenta
y recuperaciones de contraseña. Ninguno de estos pasos vive en el repositorio (no se puede aplicar
con una migración SQL), así que se documenta aquí en vez de asumirse
implícito. Ver `Bible/DECISIONS.md` ADR-068 para las decisiones de
autenticación e invitaciones.

## 1. Resend

1. Verificar un dominio de envío en Resend (registros SPF y DKIM en el
   proveedor DNS del dominio).
2. Crear una API key con permiso de envío.
3. Guardar la API key en un gestor de secretos, no en el repositorio.

## 2. SMTP personalizado en Supabase (confirmación de cuenta y recuperación de contraseña)

En el Dashboard del proyecto de Supabase:

1. **Project Settings → Authentication → SMTP Settings** → activar "Enable
   Custom SMTP".
   - Host: `smtp.resend.com`
   - Puerto: `465` (SSL) o `587` (STARTTLS)
   - Usuario: `resend`
   - Contraseña: la API key de Resend
   - Sender email: una dirección sobre el dominio verificado, por ejemplo
     `no-reply@aoraestudio.com`
   - Sender name: `Juntoss`
2. **Authentication → Email Templates**:
   - Editar la plantilla **"Confirm signup"** para mostrar `{{ .Token }}`
     (el código de un solo uso) de forma prominente, en vez del enlace de
     confirmación por defecto. `Bible/PRODUCT.md` §10 exige que la
     interfaz no asuma una longitud fija de código, así que el frontend
     debe leer la longitud real configurada, no asumir 6 dígitos.
   - Editar la plantilla **"Reset Password"** con el mismo criterio: código,
     no enlace.
3. **Authentication → Settings**: confirmar la longitud y expiración reales
   del código OTP configuradas para el proyecto (son configurables por
   Supabase y no deben hardcodearse en la app).

## 3. Invitaciones a espacios

Las invitaciones no se envían con Resend. Si el correo pertenece a una cuenta
de Juntoss, esa persona verá el aviso al abrir la app y podrá recibir un push.
La interfaz no genera enlaces manuales. Si el correo todavía no tiene cuenta,
no se crea ninguna invitación y se pide que la persona descargue la app y se
registre primero. La configuración del push vive en
`docs/setup/PUSH_NOTIFICATIONS_SETUP.md`.

## 4. Verificación

- Registrar una cuenta de prueba y confirmar que el correo de código llega
  desde el dominio verificado de Resend, no desde el remitente por defecto
  de Supabase.
- Solicitar "Olvidé mi contraseña" y confirmar el mismo punto.
- Crear una invitación dirigida a una cuenta de prueba, abrir Juntoss con esa
  cuenta y confirmar que el aviso de Inicio permite aceptarla o dejarla para
  más tarde.
