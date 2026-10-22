/** Formatea un `Date` como `YYYY-MM-DD` en hora local (no UTC). */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Devuelve la fecha de hoy como `YYYY-MM-DD` en hora local. */
export function getLocalTodayKey(): string {
  return toLocalDateKey(new Date());
}

// Se crea una sola vez: construir un `Intl.DateTimeFormat` es caro en Hermes y
// las listas formatean una fecha por fila.
const numericDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Formatea una fecha `YYYY-MM-DD` como `DD/MM/YYYY` (es-ES). */
export function formatNumericLocalDate(dateKey: string): string {
  return numericDateFormatter.format(new Date(`${dateKey}T12:00:00`));
}
