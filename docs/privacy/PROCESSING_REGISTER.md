# PROCESSING_REGISTER.md

> Registro de actividades de tratamiento, al estilo del artículo 30 del RGPD. Última actualización: 2026-08-07.

## Responsable

Alan Rios y Alejandro Perez, con residencia en Venezuela y España respectivamente. Contacto de privacidad: aora.estudio.o@gmail.com.

## Actividad 1 — Cuenta y autenticación

- **Finalidad:** crear y mantener la cuenta del usuario, iniciar sesión, recuperar acceso.
- **Datos:** nombre, correo, identificador de usuario, metadatos técnicos de sesión.
- **Base jurídica:** ejecución de contrato.
- **Encargado:** Supabase (Auth).
- **Conservación:** mientras exista la cuenta; ver `RETENTION_TABLE.md`.
- **Transferencias:** LEGAL_REVIEW_REQUIRED (región del proyecto Supabase).

## Actividad 2 — Registro de movimientos financieros

- **Finalidad:** permitir registrar, organizar y consultar gastos e ingresos.
- **Datos:** importe, tipo, categoría, título, fecha, recurrencia, espacio, autoría.
- **Base jurídica:** ejecución de contrato.
- **Encargado:** Supabase (Database), solo si el usuario tiene cuenta; en modo invitado el dato no sale del dispositivo.
- **Conservación:** mientras exista la cuenta o los datos locales; ver `RETENTION_TABLE.md`.
- **Transferencias:** LEGAL_REVIEW_REQUIRED.

## Actividad 3 — Espacios compartidos

- **Finalidad:** compartir de forma selectiva finanzas con otra persona (por ejemplo, en pareja).
- **Datos:** membresía del espacio, movimientos y categorías visibles para los miembros, autoría.
- **Base jurídica:** ejecución de contrato (el propio usuario decide compartir el espacio).
- **Encargado:** Supabase.
- **Conservación:** ver sección 13/17 de la Política de privacidad y `Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md` §17.
- **Transferencias:** LEGAL_REVIEW_REQUIRED.

## Actividad 4 — Recordatorios locales

- **Finalidad:** avisar al usuario, si lo activa, de gastos/ingresos previstos.
- **Datos:** reglas de recordatorio, y opcionalmente importe/categoría/título en el texto de la notificación (desactivable).
- **Base jurídica:** consentimiento (permiso de notificaciones del sistema operativo).
- **Encargado:** ninguno externo (notificaciones locales, no hay push remoto).
- **Conservación:** hasta que el usuario desactive la regla o borre sus datos.
- **Transferencias:** ninguna.

## Actividad 5 — Evidencia de aceptación legal

- **Finalidad:** conservar prueba de que el usuario aceptó los términos y la política vigentes.
- **Datos:** tipo de documento, versión, fecha, versión de app, idioma, origen.
- **Base jurídica:** obligación legal / interés legítimo en poder demostrar el consentimiento.
- **Encargado:** Supabase.
- **Conservación:** LEGAL_REVIEW_REQUIRED (hoy se elimina en cascada al eliminar la cuenta; revisar si conviene conservar una copia anonimizada más tiempo).
- **Transferencias:** LEGAL_REVIEW_REQUIRED.

## Actividad 6 — Publicidad (futura, no activa)

No aplica todavía: Juntos no muestra anuncios. Cuando se integre AdMob, esta actividad deberá documentarse aquí antes de activarse (ver `SDK_INVENTORY.md`).
