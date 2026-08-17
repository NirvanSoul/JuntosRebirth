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

/**
 * Formatea una clave `YYYY-MM-DD` como fecha larga en español
 * (p. ej. «30 de julio de 2026»). Mediodía local para evitar el desfase UTC.
 */
export function formatLongSpanishDate(dateKey: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`));
}
