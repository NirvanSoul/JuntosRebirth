import { useMemo } from 'react';

import {
  getPreviousDateFilter,
  listTransactionsBeforeDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import type { SessionTransaction } from '@/features/transactions/types';

type PeriodCarryOverInput = {
  dateFilter: TransactionDateFilter;
  enabled: boolean;
  summarizeBalance: (transactions: readonly SessionTransaction[]) => number;
  transactions: readonly SessionTransaction[];
};

/**
 * Lo que sobró o se debe de los periodos anteriores, para el periodo elegido y
 * para el previo con el que se compara. Sumado al balance del periodo da el
 * dinero disponible al cerrarlo.
 */
export function usePeriodCarryOver({
  dateFilter,
  enabled,
  summarizeBalance,
  transactions,
}: PeriodCarryOverInput): { currentMinor: number; previousMinor: number } {
  const carryOverTransactions = useMemo(
    () =>
      enabled ? listTransactionsBeforeDateFilter(transactions, dateFilter) : [],
    [dateFilter, enabled, transactions],
  );
  const previousCarryOverTransactions = useMemo(() => {
    const previousFilter = enabled ? getPreviousDateFilter(dateFilter) : null;
    return previousFilter
      ? listTransactionsBeforeDateFilter(transactions, previousFilter)
      : [];
  }, [dateFilter, enabled, transactions]);

  return {
    currentMinor: summarizeBalance(carryOverTransactions),
    previousMinor: summarizeBalance(previousCarryOverTransactions),
  };
}
