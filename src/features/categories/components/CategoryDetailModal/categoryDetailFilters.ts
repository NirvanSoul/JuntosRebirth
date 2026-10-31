import type {
  TransactionAuthorFilter,
  TransactionFilters,
} from '@/features/activity/components/TransactionFiltersModal';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import { parseBudgetDateKey } from '@/features/categories/utils/categoryBudgetPeriod';
import { getTransactionPeriodRange } from '@/features/dashboard/utils/transactionPeriod';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { toLocalDateKey } from '@/lib/date/localDate';

/** El detalle abre centrado en el mes en curso; el usuario amplía o acota. */
export function createInitialFilters(
  currency: CurrencyCode,
  author: TransactionAuthorFilter = 'all',
): TransactionFilters {
  return {
    author,
    category: [],
    currency,
    date: { period: 'month', selectedDate: new Date() },
    recurrence: 'all',
    type: 'all',
  };
}

/**
 * Fecha con la que se resuelve el presupuesto del periodo elegido: hoy si el
 * periodo lo incluye (o es todo el historial) y, si no, su primer día.
 */
export function getBudgetReferenceDate(
  filter: TransactionDateFilter,
  today = new Date(),
): Date {
  if (filter === 'all') return today;
  const range =
    filter.period === 'custom'
      ? {
          start: parseBudgetDateKey(filter.startDate),
          end: parseBudgetDateKey(filter.endDate),
        }
      : getTransactionPeriodRange(filter.period, filter.selectedDate);
  const todayKey = toLocalDateKey(today);
  return todayKey >= toLocalDateKey(range.start) &&
    todayKey <= toLocalDateKey(range.end)
    ? today
    : range.start;
}
