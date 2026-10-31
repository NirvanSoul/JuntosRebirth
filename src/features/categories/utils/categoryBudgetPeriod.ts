import type {
  BudgetPeriod,
  BudgetSchedule,
  Category,
  CategoryBudget,
  CategoryBudgets,
} from '@/features/categories/types';
import {
  formatTransactionPeriod,
  getTransactionPeriodRange,
} from '@/features/dashboard/utils/transactionPeriod';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { toLocalDateKey } from '@/lib/date/localDate';

export type BudgetPeriodRange = { end: Date; start: Date };

/** Tramo del presupuesto vigente en una fecha, con sus límites si los tiene. */
type BudgetSegment = {
  amountMinor: number;
  endsOn?: string;
  schedule: BudgetSchedule;
  startsOn?: string;
};

export const monthlyBudgetSchedule: BudgetSchedule = { period: 'month' };

const dayInMs = 24 * 60 * 60 * 1000;

function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12);
}

export function parseBudgetDateKey(dateKey: string): Date {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  return createLocalDate(year, month - 1, day);
}

/** Días naturales entre dos fechas locales, sin depender del cambio de hora. */
function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      dayInMs,
  );
}

function addDays(date: Date, days: number): Date {
  return createLocalDate(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
  );
}

function addDaysToKey(dateKey: string, days: number): string {
  return toLocalDateKey(addDays(parseBudgetDateKey(dateKey), days));
}

export function getBudgetSchedule(
  budget: Pick<CategoryBudget, 'budgetSchedule'>,
): BudgetSchedule {
  return budget.budgetSchedule ?? monthlyBudgetSchedule;
}

/**
 * Periodo de una periodicidad que contiene `date`. Mensual, semanal y
 * quincenal coinciden con los periodos de Actividad; el personalizado cuenta
 * bloques de `intervalDays` desde `anchorOn`, también hacia atrás.
 */
export function getBudgetPeriodRange(
  schedule: BudgetSchedule,
  date: Date,
): BudgetPeriodRange {
  if (schedule.period !== 'custom') {
    return getTransactionPeriodRange(schedule.period, date);
  }

  const anchor = parseBudgetDateKey(schedule.anchorOn);
  const index = Math.floor(daysBetween(anchor, date) / schedule.intervalDays);
  const start = addDays(anchor, index * schedule.intervalDays);
  return { start, end: addDays(start, schedule.intervalDays - 1) };
}

/** Tramo vigente en `date`: uno anterior de `budgetHistory` o el actual. */
function getBudgetSegment(budget: CategoryBudget, date: Date): BudgetSegment {
  const dateKey = toLocalDateKey(date);
  const history = budget.budgetHistory ?? [];
  let startsOn: string | undefined;
  for (const segment of history) {
    if (dateKey <= segment.endsOn) {
      return { ...segment, ...(startsOn ? { startsOn } : {}) };
    }
    startsOn = addDaysToKey(segment.endsOn, 1);
  }
  return {
    amountMinor: budget.budgetMinor ?? 0,
    schedule: getBudgetSchedule(budget),
    ...(startsOn ? { startsOn } : {}),
  };
}

export function getBudgetScheduleAt(
  budget: CategoryBudget,
  date: Date,
): BudgetSchedule {
  return getBudgetSegment(budget, date).schedule;
}

/**
 * Periodo del presupuesto de la categoría que contiene `date`. En el cambio
 * de un tramo a otro el periodo se recorta para que no se solapen.
 */
export function getCategoryBudgetRange(
  budget: CategoryBudget,
  date: Date,
): BudgetPeriodRange {
  const segment = getBudgetSegment(budget, date);
  const range = getBudgetPeriodRange(segment.schedule, date);
  const startKey = toLocalDateKey(range.start);
  const endKey = toLocalDateKey(range.end);
  return {
    start:
      segment.startsOn && segment.startsOn > startKey
        ? parseBudgetDateKey(segment.startsOn)
        : range.start,
    end:
      segment.endsOn && segment.endsOn < endKey
        ? parseBudgetDateKey(segment.endsOn)
        : range.end,
  };
}

export function getCategoryBudgetStartKey(
  budget: CategoryBudget,
  date: Date,
): string {
  return toLocalDateKey(getCategoryBudgetRange(budget, date).start);
}

/** Periodo anterior o siguiente: el día justo antes o después del actual. */
export function shiftCategoryBudgetPeriod(
  budget: CategoryBudget,
  date: Date,
  offset: -1 | 1,
): Date {
  const range = getCategoryBudgetRange(budget, date);
  return offset === 1 ? addDays(range.end, 1) : addDays(range.start, -1);
}

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

export function formatBudgetDateRange({ start, end }: BudgetPeriodRange) {
  const startLabel = shortDateFormatter.format(start).replace('.', '');
  const endLabel = shortDateFormatter.format(end).replace('.', '');
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  return `${startLabel} – ${endLabel} ${startYear === endYear ? endYear : `${startYear}/${endYear}`}`;
}

export function formatCategoryBudgetPeriod(
  budget: CategoryBudget,
  date: Date,
): string {
  const schedule = getBudgetScheduleAt(budget, date);
  const range = getCategoryBudgetRange(budget, date);
  if (schedule.period !== 'custom' && isNativeRange(schedule, range)) {
    return formatTransactionPeriod(schedule.period, date);
  }
  return formatBudgetDateRange(range);
}

function isNativeRange(
  schedule: BudgetSchedule,
  range: BudgetPeriodRange,
): boolean {
  const native = getBudgetPeriodRange(schedule, range.start);
  return (
    toLocalDateKey(native.start) === toLocalDateKey(range.start) &&
    toLocalDateKey(native.end) === toLocalDateKey(range.end)
  );
}

const periodLabels: Record<Exclude<BudgetPeriod, 'custom'>, string> = {
  month: 'Mensual',
  week: 'Semanal',
  fortnight: 'Quincenal',
};

export function describeBudgetSchedule(schedule: BudgetSchedule): string {
  return schedule.period === 'custom'
    ? `Cada ${schedule.intervalDays} días`
    : periodLabels[schedule.period];
}

/**
 * Importe del presupuesto en el periodo que contiene `date`: la excepción de
 * ese periodo si existe, o el importe de su tramo.
 */
export function resolveBudgetAmount(
  budget: CategoryBudget,
  date: Date,
): number | undefined {
  if (!budget.budgetMinor) return undefined;

  const startKey = getCategoryBudgetStartKey(budget, date);
  return (
    budget.budgetOverrides?.find(
      (override) => override.periodStartOn === startKey,
    )?.amountMinor ?? getBudgetSegment(budget, date).amountMinor
  );
}

export function hasBudgetOverride(budget: CategoryBudget, date: Date): boolean {
  const startKey = getCategoryBudgetStartKey(budget, date);
  return (
    budget.budgetOverrides?.some(
      (override) => override.periodStartOn === startKey,
    ) ?? false
  );
}

/**
 * Presupuesto para un rango cualquiera (p. ej. una semana de un presupuesto
 * mensual): cada periodo que toca aporta su importe en proporción a los días
 * que comparte con el rango.
 */
export function getProratedBudgetAmount(
  budget: CategoryBudget,
  startKey: string,
  endKey: string,
): number {
  if (!budget.budgetMinor || startKey > endKey) return 0;

  const end = parseBudgetDateKey(endKey);
  let cursor = parseBudgetDateKey(startKey);
  let total = 0;
  while (toLocalDateKey(cursor) <= endKey) {
    const range = getCategoryBudgetRange(budget, cursor);
    const periodDays = daysBetween(range.start, range.end) + 1;
    const overlapEnd = range.end < end ? range.end : end;
    const overlapDays = daysBetween(cursor, overlapEnd) + 1;
    total +=
      ((resolveBudgetAmount(budget, cursor) ?? 0) * overlapDays) / periodDays;
    cursor = addDays(range.end, 1);
  }
  return Math.round(total);
}

/** Rango exacto de un periodo del presupuesto, si lo es. */
export function isCategoryBudgetPeriod(
  budget: CategoryBudget,
  startKey: string,
  endKey: string,
): boolean {
  const range = getCategoryBudgetRange(budget, parseBudgetDateKey(startKey));
  return (
    toLocalDateKey(range.start) === startKey &&
    toLocalDateKey(range.end) === endKey
  );
}

export function isSameBudgetSchedule(
  left: BudgetSchedule,
  right: BudgetSchedule,
): boolean {
  if (left.period !== 'custom' || right.period !== 'custom') {
    return left.period === right.period;
  }
  return (
    left.intervalDays === right.intervalDays && left.anchorOn === right.anchorOn
  );
}

export type CategoryBudgetChange =
  | { kind: 'remove' }
  /** Todo el presupuesto, pasado y futuro. */
  | { kind: 'base'; amountMinor: number; schedule: BudgetSchedule }
  /** Nueva periodicidad e importe desde `startsOn`; lo anterior se conserva. */
  | {
      amountMinor: number;
      kind: 'from';
      schedule: BudgetSchedule;
      startsOn: string;
    }
  /** Sin `amountMinor` el periodo vuelve al importe de su tramo. */
  | { amountMinor?: number; kind: 'period'; periodStartOn: string };

/**
 * Aplica un cambio al presupuesto de una moneda; `undefined` es que esa
 * moneda queda sin presupuesto. Cambiar la periodicidad de todo el
 * presupuesto descarta las excepciones y los tramos anteriores: sus fechas
 * dejan de coincidir con los nuevos periodos.
 */
export function applyCategoryBudgetChange(
  budget: CategoryBudget | undefined,
  change: CategoryBudgetChange,
): CategoryBudget | undefined {
  if (change.kind === 'remove') return undefined;

  const schedule = (next: BudgetSchedule) =>
    next.period === 'month' ? {} : { budgetSchedule: next };

  if (change.kind === 'base') {
    const keepsPeriods =
      budget !== undefined &&
      isSameBudgetSchedule(getBudgetSchedule(budget), change.schedule);
    return {
      budgetMinor: change.amountMinor,
      ...schedule(change.schedule),
      ...(keepsPeriods && budget.budgetOverrides
        ? { budgetOverrides: budget.budgetOverrides }
        : {}),
      ...(keepsPeriods && budget.budgetHistory
        ? { budgetHistory: budget.budgetHistory }
        : {}),
    };
  }

  if (!budget) return budget;

  if (change.kind === 'from') {
    const dayBefore = addDaysToKey(change.startsOn, -1);
    const previous = getBudgetSegment(budget, parseBudgetDateKey(dayBefore));
    const history = (budget.budgetHistory ?? []).filter(
      (segment) => segment.endsOn < change.startsOn,
    );
    // El tramo que contenía el día anterior termina justo antes del cambio.
    if (history.at(-1)?.endsOn !== dayBefore) {
      history.push({
        endsOn: dayBefore,
        amountMinor: previous.amountMinor,
        schedule: previous.schedule,
      });
    }
    const overrides = (budget.budgetOverrides ?? []).filter(
      (override) => override.periodStartOn < change.startsOn,
    );
    return {
      budgetMinor: change.amountMinor,
      ...schedule(change.schedule),
      ...(overrides.length > 0 ? { budgetOverrides: overrides } : {}),
      budgetHistory: history,
    };
  }

  const segmentAmount = getBudgetSegment(
    budget,
    parseBudgetDateKey(change.periodStartOn),
  ).amountMinor;
  const others = (budget.budgetOverrides ?? []).filter(
    (override) => override.periodStartOn !== change.periodStartOn,
  );
  const overrides =
    change.amountMinor === undefined || change.amountMinor === segmentAmount
      ? others
      : [
          ...others,
          {
            periodStartOn: change.periodStartOn,
            amountMinor: change.amountMinor,
          },
        ].sort((left, right) =>
          left.periodStartOn.localeCompare(right.periodStartOn),
        );
  const { budgetOverrides: _previous, ...rest } = budget;
  return overrides.length > 0 ? { ...rest, budgetOverrides: overrides } : rest;
}

export function getCategoryBudget(
  category: Pick<Category, 'budgets'>,
  currency: CurrencyCode,
): CategoryBudget | undefined {
  return category.budgets?.[currency];
}

/** Sustituye (o quita, con `undefined`) el presupuesto de una moneda. */
export function withCategoryBudget(
  category: Category,
  currency: CurrencyCode,
  budget: CategoryBudget | undefined,
): Category {
  const { [currency]: _previous, ...others } = category.budgets ?? {};
  const budgets: CategoryBudgets = budget
    ? { ...others, [currency]: budget }
    : others;
  return {
    ...category,
    budgets: Object.keys(budgets).length > 0 ? budgets : undefined,
  };
}
