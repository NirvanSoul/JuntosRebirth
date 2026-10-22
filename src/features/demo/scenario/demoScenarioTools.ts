import type {
  MoneyAccountIconName,
  MoneyAccountKind,
} from '@/features/accounts/types';
import type { CategoryIconName } from '@/features/categories/types';
import type {
  TransactionRecurrence,
  TransactionType,
} from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import type { CategoryColorToken } from '@/theme/categoryColors';

export type DemoAuthor = 'self' | 'partner';

export type DemoCategoryPlan = {
  key: string;
  name: string;
  icon: CategoryIconName;
  colorToken: CategoryColorToken;
  isDefault: boolean;
  templateKey?: string;
  budgetMinor?: number;
};

export type DemoAccountPlan = {
  key: string;
  name: string;
  kind: MoneyAccountKind;
  icon: MoneyAccountIconName;
  colorToken: CategoryColorToken;
  openingBalanceMinor: number;
};

export type DemoTransactionPlan = {
  type: TransactionType;
  amountMinor: number;
  title: string;
  categoryKey: string;
  accountKey?: string;
  occurredOn: string;
  recurrence: TransactionRecurrence;
  customOccurrenceDates?: readonly string[];
  author: DemoAuthor;
  note?: string;
  /**
   * Compra pequeña del día a día que en Venezuela se paga en bolívares. En el
   * resto de países no cambia nada.
   */
  paidInLocalCurrency?: boolean;
  /** Moneda del importe cuando no es la contable del escenario. */
  currency?: CurrencyCode;
};

export type DemoSpacePlan = {
  categories: DemoCategoryPlan[];
  accounts: DemoAccountPlan[];
  transactions: DemoTransactionPlan[];
};

/** Número en [0, 1). Con semilla para que las pruebas sean reproducibles. */
export type DemoRandom = () => number;

/** mulberry32: suficiente para variar importes, no para nada criptográfico. */
export function createDemoRandom(seed: number): DemoRandom {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne<T>(random: DemoRandom, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)]!;
}

export function randomInt(
  random: DemoRandom,
  min: number,
  max: number,
): number {
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Importes del guion, escritos en euros de España, convertidos a la moneda
 * elegida con su escala de coste de vida y redondeados como se ven en ese
 * país: céntimos donde la moneda es fuerte, centenas en el peso colombiano.
 */
export function createDemoAmounts(costScale: number, random: DemoRandom) {
  // Unidad mínima que alguien escribiría en un gasto suelto de esa moneda.
  const priceStep =
    costScale < 4
      ? 0.01
      : 10 ** Math.max(0, Math.floor(Math.log10(costScale)) - 1);
  const toMinor = (major: number) => Math.max(1, Math.round(major * 100));
  const roundTo = (value: number, step: number) =>
    Math.max(step, Math.round(value / step) * step);

  return {
    /** Gasto variable entre dos importes: supermercado, cafés, cenas. */
    price(minEur: number, maxEur: number): number {
      const local = (minEur + random() * (maxEur - minEur)) * costScale;
      // Un café cuesta 2,40 € y no 2,39 €; el ticket del súper sí lleva céntimos.
      const step = costScale < 4 && local < 20 ? 0.1 : priceStep;
      return toMinor(roundTo(local, step));
    },
    /** Cifra redonda de nómina, alquiler o aportes: 2.300 €, 4.600.000 $. */
    round(eur: number): number {
      const local = eur * costScale;
      const digits = Math.floor(Math.log10(local)) + 1;
      const step = 10 ** Math.max(0, digits - (local >= 1000 ? 3 : 2));
      return toMinor(roundTo(local, step));
    },
    /** Precio comercial terminado en 9: 10,99 €, 149 MXN, 27.900 COP. */
    charm(eur: number): number {
      const local = eur * costScale;
      if (costScale < 4) return toMinor(Math.round(local) - 0.01);
      const step = priceStep * 10;
      return toMinor(roundTo(local, step) - priceStep);
    },
  };
}

export type DemoAmounts = ReturnType<typeof createDemoAmounts>;

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fechas relativas al mes de hoy, en claves locales `YYYY-MM-DD`. */
export function createDemoCalendar(today: string) {
  const base = parseDateKey(today);

  const monthDate = (monthOffset: number, day: number): string => {
    const year = base.getUTCFullYear();
    const month = base.getUTCMonth() + monthOffset;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return toDateKey(new Date(Date.UTC(year, month, Math.min(day, lastDay))));
  };

  /** Primer día con ese día de la semana (0 = domingo) desde `dateKey`. */
  const nextWeekday = (dateKey: string, weekday: number): string => {
    const date = parseDateKey(dateKey);
    date.setUTCDate(date.getUTCDate() + ((weekday - date.getUTCDay() + 7) % 7));
    return toDateKey(date);
  };

  /** Todas las fechas de ese día de la semana dentro del mes indicado. */
  const weekdaysOfMonth = (monthOffset: number, weekday: number): string[] => {
    const dates: string[] = [];
    const lastOfMonth = monthDate(monthOffset, 31);
    let current = nextWeekday(monthDate(monthOffset, 1), weekday);
    while (current <= lastOfMonth) {
      dates.push(current);
      const next = parseDateKey(current);
      next.setUTCDate(next.getUTCDate() + 7);
      current = toDateKey(next);
    }
    return dates;
  };

  return {
    monthDate,
    nextWeekday,
    weekdaysOfMonth,
    /** Ya ocurrió (o es hoy): un gasto puntual del pasado. */
    isDue: (dateKey: string) => dateKey <= today,
  };
}

export type DemoCalendar = ReturnType<typeof createDemoCalendar>;

/** Meses de historia que se rellenan antes del actual. */
export const demoHistoryMonths = 5;

/** Recorre los meses de historia, del más antiguo al actual (offset 0). */
export function forEachHistoryMonth(run: (monthOffset: number) => void): void {
  for (let offset = -demoHistoryMonths; offset <= 0; offset += 1) run(offset);
}
