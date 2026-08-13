const excelEpochUtcMs = Date.UTC(1899, 11, 30);
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type NormalizedDateResult =
  | { occurredOn: string; ambiguous: false }
  /** Ambos componentes ≤12: no se puede saber si es DD/MM o MM/AAAA sin más
   * contexto. Se resuelve con la preferencia dada, pero se marca `ambiguous`
   * para que la fila quede señalada en la revisión (Bible §15: nunca
   * adivinar en silencio). */
  | { occurredOn: string; ambiguous: true }
  | { occurredOn: null; ambiguous: true };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  // Valida contra el propio calendario (rechaza 31/04, 30/02, etc.).
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;

  // El entero es la fecha; la parte fraccionaria es la hora del día. Un
  // `Math.round` aquí desplazaría al día siguiente cualquier serie con hora
  // igual o posterior al mediodía (ej. 45123.75 = 18:00 de un día concreto).
  const ms = excelEpochUtcMs + Math.floor(serial) * millisecondsPerDay;
  const date = new Date(ms);
  return toIsoDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

const isoDatePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const slashOrDashDatePattern = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})$/;

export type DayMonthPreference = 'DMY' | 'MDY';

/** Convierte la parte de día/mes/año de una celda a `YYYY-MM-DD`. */
export function normalizeDate(
  rawValue: string | number | null | undefined,
  dayMonthPreference: DayMonthPreference = 'DMY',
): NormalizedDateResult {
  if (rawValue === null || rawValue === undefined) {
    return { occurredOn: null, ambiguous: true };
  }

  if (typeof rawValue === 'number') {
    const occurredOn = excelSerialToIsoDate(rawValue);
    return occurredOn
      ? { occurredOn, ambiguous: false }
      : { occurredOn: null, ambiguous: true };
  }

  // Los extractos suelen añadir una hora, zona o texto tras la fecha. La
  // importación trabaja por día económico: nunca usa esa información para
  // desplazar o volver ambigua la fecha.
  const trimmed = rawValue.trim().match(/^\s*([^\sT]+)/)?.[1] ?? '';
  if (!trimmed) {
    return { occurredOn: null, ambiguous: true };
  }

  if (/^\d+$/.test(trimmed)) {
    const occurredOn = excelSerialToIsoDate(Number(trimmed));
    if (occurredOn) return { occurredOn, ambiguous: false };
  }

  const isoMatch = isoDatePattern.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const occurredOn = toIsoDate(Number(year), Number(month), Number(day));
    return occurredOn
      ? { occurredOn, ambiguous: false }
      : { occurredOn: null, ambiguous: true };
  }

  const slashMatch = slashOrDashDatePattern.exec(trimmed);
  if (slashMatch) {
    const [, first = '', second = '', third = ''] = slashMatch;
    const a = Number(first);
    const b = Number(second);
    const c = Number(third);

    // AAAA/MM/DD cuando el primer componente ya es un año de 4 dígitos.
    if (first.length === 4) {
      const occurredOn = toIsoDate(a, b, c);
      return occurredOn
        ? { occurredOn, ambiguous: false }
        : { occurredOn: null, ambiguous: true };
    }

    const year = third.length === 2 ? 2000 + c : c;
    const dayFirstIsValid = toIsoDate(year, b, a) !== null;
    const monthFirstIsValid = toIsoDate(year, a, b) !== null;

    if (dayFirstIsValid && !monthFirstIsValid) {
      return { occurredOn: toIsoDate(year, b, a)!, ambiguous: false };
    }
    if (monthFirstIsValid && !dayFirstIsValid) {
      return { occurredOn: toIsoDate(year, a, b)!, ambiguous: false };
    }
    if (dayFirstIsValid && monthFirstIsValid) {
      const occurredOn =
        dayMonthPreference === 'DMY'
          ? toIsoDate(year, b, a)!
          : toIsoDate(year, a, b)!;
      return { occurredOn, ambiguous: false };
    }

    return { occurredOn: null, ambiguous: true };
  }

  return { occurredOn: null, ambiguous: true };
}
