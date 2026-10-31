import { useCallback } from 'react';

import type { SessionTransaction } from '@/features/transactions/types';

import type { TransactionFilters } from '@/features/activity/components/TransactionFiltersModal';
import { useTransactionAuthorFilter } from '@/features/activity/hooks/useTransactionAuthorFilter';
import type { TransactionDateFilter } from '@/features/activity/utils/transactionDateFilter';
import { useSessionState } from '@/hooks/useSessionState';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

type ActivityFilters = Omit<TransactionFilters, 'author' | 'currency'> & {
  /** `null` sigue la moneda global del encabezado. */
  currency: CurrencyCode | null;
};

const initialActivityFilters: ActivityFilters = {
  category: [],
  currency: null,
  date: 'all',
  recurrence: 'all',
  type: 'all',
};

/**
 * Filtros de movimientos de una pantalla (`scope`: Actividad, Mapa). Se
 * conservan al cambiar de pantalla y vuelven a su estado inicial al cerrar la
 * app. Actividad empieza en el mes en curso; «Desde el inicio» se elige.
 */
export function useActivityFilters(scope: 'activity' | 'map' = 'activity') {
  const [filters, setFilters] = useSessionState<ActivityFilters>(
    `${scope}:filters`,
    scope === 'activity'
      ? {
          ...initialActivityFilters,
          date: { period: 'month', selectedDate: new Date() },
        }
      : initialActivityFilters,
  );
  const authorFilter = useTransactionAuthorFilter('all', `${scope}:author`);
  const { matchesAuthor, setAuthor } = authorFilter;
  const { category, recurrence, type } = filters;
  /** Tipo, categoría, recurrencia y autor; la fecha y la moneda van aparte. */
  const matchesMovementFilters = useCallback(
    (transaction: SessionTransaction) =>
      (type === 'all' || transaction.type === type) &&
      (category.length === 0 || category.includes(transaction.categoryId)) &&
      (recurrence === 'all' || transaction.recurrence === recurrence) &&
      matchesAuthor(transaction),
    [category, matchesAuthor, recurrence, type],
  );
  const applyFilters = useCallback(
    ({ author, ...next }: TransactionFilters) => {
      setFilters(next);
      setAuthor(author ?? 'all');
    },
    [setAuthor, setFilters],
  );

  /** El periodo se elige fuera del modal de filtros y se aplica al momento. */
  const setDate = useCallback(
    (date: TransactionDateFilter) =>
      setFilters((current) => ({ ...current, date })),
    [setFilters],
  );

  return {
    ...filters,
    applyFilters,
    authorFilter,
    matchesMovementFilters,
    setDate,
  };
}
