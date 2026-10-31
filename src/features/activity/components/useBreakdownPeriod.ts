import { useMemo, useState } from 'react';

import {
  matchesTransactionDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { getTransactionPeriodRange } from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { toLocalDateKey } from '@/lib/date/localDate';

function getPeriodKey(filter: TransactionDateFilter): string {
  if (filter === 'all') return 'all';
  if (filter.period === 'custom') {
    return `custom-${filter.startDate}-${filter.endDate}`;
  }

  const range = getTransactionPeriodRange(filter.period, filter.selectedDate);
  return `${filter.period}-${toLocalDateKey(range.start)}`;
}

/** El historial completo y el periodo en curso no dejan avanzar al futuro. */
function reachesToday(filter: TransactionDateFilter): boolean {
  if (filter === 'all') return true;
  if (filter.period === 'custom') return false;

  const range = getTransactionPeriodRange(filter.period, filter.selectedDate);
  return toLocalDateKey(range.end) >= toLocalDateKey(new Date());
}

/**
 * Periodo de los donuts de Actividad: abre en el mes en curso y admite los
 * mismos filtros que el detalle de categoría.
 */
export function useBreakdownPeriod(
  transactions: readonly SessionTransaction[],
) {
  const [filter, setFilter] = useState<TransactionDateFilter>(() => ({
    period: 'month',
    selectedDate: new Date(),
  }));
  const periodTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        matchesTransactionDateFilter(transaction.occurredOn, filter),
      ),
    [filter, transactions],
  );

  return {
    filter,
    nextDisabled: reachesToday(filter),
    periodKey: getPeriodKey(filter),
    periodTransactions,
    setFilter,
  };
}
