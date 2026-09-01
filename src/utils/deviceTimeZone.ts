/**
 * Zona horaria IANA del dispositivo, p. ej. `Europe/Madrid`.
 *
 * La API calcula por día sobre la zona del espacio, así que enviarla mal
 * descuadra los totales de un día completo. `UTC` solo es el último recurso
 * cuando el motor no la resuelve.
 */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
