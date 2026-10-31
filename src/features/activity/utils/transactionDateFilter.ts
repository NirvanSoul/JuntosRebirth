import {
  describePreviousPeriod,
  getTransactionPeriodRange,
  listTransactionsByPeriod,
  shiftTransactionPeriod,
  type TransactionPeriod,
} from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { projectRecurringTransactions } from '@/features/transactions/utils/transactionRecurrence';
import { listTransactionsThroughCurrentMonth } from '@/features/transactions/utils/transactionSummary';
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
    ? 'el periodo anterior'
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

/**
 * Movimientos dentro del filtro, con las recurrencias proyectadas y del más
 * reciente al más antiguo. `'all'` proyecta solo hasta fin del mes en curso,
 * igual que el detalle de categoría, para no listar series infinitas.
 */
export function listTransactionsByDateFilter(
  transactions: readonly SessionTransaction[],
  filter: TransactionDateFilter,
): SessionTransaction[] {
  if (filter === 'all') {
    // Copia: la proyección se comparte entre llamadas y no debe mutarse.
    return [...listTransactionsThroughCurrentMonth(transactions)].sort(
      (left, right) => right.occurredOn.localeCompare(left.occurredOn),
    );
  }

  if (filter.period !== 'custom') {
    return listTransactionsByPeriod(
      transactions,
      filter.period,
      filter.selectedDate,
    );
  }

  return projectRecurringTransactions({
    transactions,
    startOn: filter.startDate,
    endOn: filter.endDate,
  })
    .filter(
      (transaction) =>
        transaction.occurredOn >= filter.startDate &&
        transaction.occurredOn <= filter.endDate,
    )
    .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
}

function getDateFilterStartKey(filter: TransactionDateFilter): string | null {
  if (filter === 'all') return null;
  if (filter.period === 'custom') return filter.startDate;

  return toLocalDateKey(
    getTransactionPeriodRange(filter.period, filter.selectedDate).start,
  );
}

/** Último día que abarca el filtro; `'all'` no tiene fin. */
export function getDateFilterEndKey(
  filter: TransactionDateFilter,
): string | null {
  if (filter === 'all') return null;
  if (filter.period === 'custom') return filter.endDate;

  return toLocalDateKey(
    getTransactionPeriodRange(filter.period, filter.selectedDate).end,
  );
}

/**
 * Movimientos anteriores al inicio del filtro, con las recurrencias
 * proyectadas: son el saldo que arrastra el periodo. `'all'` no tiene nada
 * antes.
 */
export function listTransactionsBeforeDateFilter(
  transactions: readonly SessionTransaction[],
  filter: TransactionDateFilter,
): SessionTransaction[] {
  const startOn = getDateFilterStartKey(filter);
  if (!startOn) return [];

  return projectRecurringTransactions({
    transactions,
    endOn: toLocalDateKey(addDays(parseDateKey(startOn), -1)),
  }).filter((transaction) => transaction.occurredOn < startOn);
}
