import { getCalendars } from 'expo-localization';

import { toLocalDateKey } from '@/lib/date/localDate';

/**
 * Hora de reloj local `HH:mm` (24 h, sin segundos ni zona), el formato con el
 * que se guardan los recordatorios y la hora de un movimiento. Como la fecha
 * local `YYYY-MM-DD`, nunca se convierte de zona horaria.
 */
const timeOfDayPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeOfDay(value: unknown): value is string {
  return typeof value === 'string' && timeOfDayPattern.test(value);
}

/** Formatea la hora de un `Date` como `HH:mm` en hora local. */
export function formatTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Hora que se guarda al registrar un movimiento con fecha `occurredOn`. Si es
 * hoy, la persona lo está anotando en el momento: se usa la hora actual. Si
 * es otro día no se adivina; puede ponerla después en el detalle.
 */
export function resolveRegistrationTimeOfDay(
  occurredOn: string,
  now: Date = new Date(),
): string | undefined {
  return occurredOn === toLocalDateKey(now) ? formatTimeOfDay(now) : undefined;
}

/** Convierte una hora `HH:mm` en un `Date` de hoy, para inicializar un selector nativo. */
export function timeOfDayToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour ?? 0, minute ?? 0, 0, 0);
  return date;
}

/**
 * `true` si el sistema muestra la hora en 24 h. El idioma de la app no lo
 * decide: un teléfono en español puede usar 12 h y al revés.
 */
function deviceUses24HourClock(): boolean | null {
  try {
    return getCalendars()[0]?.uses24hourClock ?? null;
  } catch {
    return null;
  }
}

/**
 * Hora `HH:mm` tal como la mostraría el sistema: «14:35» o «2:35 p. m.».
 * El formateador se crea al formatear porque la preferencia 12/24 h puede
 * cambiar con la app abierta.
 */
export function formatTimeOfDayForDisplay(time: string): string {
  const uses24HourClock = deviceUses24HourClock();
  return new Intl.DateTimeFormat('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    ...(uses24HourClock === null ? {} : { hour12: !uses24HourClock }),
  }).format(timeOfDayToDate(time));
}
