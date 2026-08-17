import {
  describePreviousPeriod,
  getTransactionPeriodRange,
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import { toLocalDateKey } from '@/lib/date/localDate';

export type TransactionDateFilter =
  | 'all'
  | { period: TransactionPeriod; selectedDate: Date }
  | { endDate: string; period: 'custom'; startDate: string };

export function getComparisonPeriodLabel(
  filter: TransactionDateFilter,
): string | undefined {
  if (filter === 'all') return undefined;
  return filter.period === 'custom'
    ? 'vs. periodo anterior'
    : describePreviousPeriod(filter.period);
}

export function matchesTransactionDateFilter(
  occurredOn: string,
  filter: TransactionDateFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter.period === 'custom') {
    return occurredOn >= filter.startDate && occurredOn <= filter.endDate;
  }

  const range = getTransactionPeriodRange(filter.period, filter.selectedDate);
  const start = toLocalDateKey(range.start);
  const end = toLocalDateKey(range.end);

  return occurredOn >= start && occurredOn <= end;
}

function parseDateKey(dateKey: string): Date {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));

  return new Date(year, month - 1, day, 12);
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
  );
}

/**
 * `'all'` no tiene un periodo acotado, así que no existe un "periodo
 * anterior" con el que comparar: la comparación se oculta en ese caso.
 */
export function getPreviousDateFilter(
  filter: TransactionDateFilter,
): TransactionDateFilter | null {
  if (filter === 'all') {
    return null;
  }

  if (filter.period === 'custom') {
    const start = parseDateKey(filter.startDate);
    const end = parseDateKey(filter.endDate);
    const durationDays = Math.round(
      (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    const previousEnd = addDays(start, -1);
    const previousStart = addDays(previousEnd, -durationDays);

    return {
      period: 'custom',
      startDate: toLocalDateKey(previousStart),
      endDate: toLocalDateKey(previousEnd),
    };
  }

  return {
    period: filter.period,
    selectedDate: shiftTransactionPeriod(
      filter.period,
      filter.selectedDate,
      -1,
    ),
  };
}
