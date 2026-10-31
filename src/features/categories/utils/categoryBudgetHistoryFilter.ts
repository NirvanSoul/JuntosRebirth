import type { CategoryBudget } from '@/features/categories/types';
import {
  getBudgetPeriodRange,
  getBudgetScheduleAt,
  getCategoryBudgetRange,
  parseBudgetDateKey,
} from '@/features/categories/utils/categoryBudgetPeriod';
import {
  getTransactionPeriodRange,
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import { toLocalDateKey } from '@/lib/date/localDate';

/** Lo que muestra el historial: un periodo de Actividad o un rango propio. */
export type BudgetHistoryFilter =
  | { period: TransactionPeriod; selectedDate: Date }
  | { endDate: string; period: 'custom'; startDate: string };

const dayInMs = 24 * 60 * 60 * 1000;

export function getBudgetHistoryFilterRange(filter: BudgetHistoryFilter): {
  endKey: string;
  startKey: string;
} {
  if (filter.period === 'custom') {
    return { startKey: filter.startDate, endKey: filter.endDate };
  }
  const range = getTransactionPeriodRange(filter.period, filter.selectedDate);
  return {
    startKey: toLocalDateKey(range.start),
    endKey: toLocalDateKey(range.end),
  };
}

/**
 * Filtro que muestra el periodo del presupuesto que contiene `date`. Si es un
 * mes, semana o quincena completos se expresa como tal, para que el selector
 * lo marque; si no (cada N días o un periodo recortado), como rango.
 */
export function getNativeBudgetHistoryFilter(
  budget: CategoryBudget,
  date: Date,
): BudgetHistoryFilter {
  const range = getCategoryBudgetRange(budget, date);
  const schedule = getBudgetScheduleAt(budget, date);
  const startKey = toLocalDateKey(range.start);
  const endKey = toLocalDateKey(range.end);
  if (schedule.period !== 'custom') {
    const full = getBudgetPeriodRange(schedule, range.start);
    if (
      toLocalDateKey(full.start) === startKey &&
      toLocalDateKey(full.end) === endKey
    ) {
      return { period: schedule.period, selectedDate: range.start };
    }
  }
  return { period: 'custom', startDate: startKey, endDate: endKey };
}

/** Periodo anterior o siguiente; un rango propio avanza su misma duración. */
export function shiftBudgetHistoryFilter(
  filter: BudgetHistoryFilter,
  offset: -1 | 1,
): BudgetHistoryFilter {
  if (filter.period !== 'custom') {
    return {
      period: filter.period,
      selectedDate: shiftTransactionPeriod(
        filter.period,
        filter.selectedDate,
        offset,
      ),
    };
  }
  const start = parseBudgetDateKey(filter.startDate);
  const end = parseBudgetDateKey(filter.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / dayInMs) + 1;
  const move = (date: Date) =>
    toLocalDateKey(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + offset * days,
        12,
      ),
    );
  return {
    period: 'custom',
    startDate: move(start),
    endDate: move(end),
  };
}
