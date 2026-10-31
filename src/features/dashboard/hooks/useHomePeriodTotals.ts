import { useMemo } from 'react';

import {
  getPreviousDateFilter,
  listTransactionsByDateFilter,
  type TransactionDateFilter,
} from '@/features/activity/utils/transactionDateFilter';
import { usePeriodCarryOver } from '@/features/dashboard/components/TransactionPeriodModal/usePeriodCarryOver';
import { getTransactionPeriodRange } from '@/features/dashboard/utils/transactionPeriod';
import type { SessionTransaction } from '@/features/transactions/types';
import { calculatePeriodComparison } from '@/features/transactions/utils/periodComparison';
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import { useSessionState } from '@/hooks/useSessionState';
import { toLocalDateKey } from '@/lib/date/localDate';

/** Contexto accesible del arco y los indicadores según el periodo elegido. */
function describeDateFilter(filter: TransactionDateFilter): string {
  if (filter === 'all') return 'desde el inicio';
  if (filter.period === 'month') {
    const range = getTransactionPeriodRange('month', filter.selectedDate);
    const today = toLocalDateKey(new Date());
    if (
      today >= toLocalDateKey(range.start) &&
      today <= toLocalDateKey(range.end)
    ) {
      return 'de este mes';
    }
  }
  return 'del periodo';
}

/**
 * Periodo del arco y los indicadores de Inicio: abre en el mes en curso y
 * calcula sus ingresos y gastos, la comparación con el periodo anterior y el
 * balance disponible al cerrarlo, como en Mapa.
 */
export function useHomePeriodTotals(
  currencyTransactions: readonly SessionTransaction[],
  showComparisonIndicators: boolean,
) {
  // El periodo elegido sobre el arco se conserva al cambiar de pantalla.
  const [dateFilter, setDateFilter] = useSessionState<TransactionDateFilter>(
    'home:date',
    { period: 'month', selectedDate: new Date() },
  );
  const periodContext = describeDateFilter(dateFilter);
  // El arco, los indicadores y el balance siguen el periodo elegido.
  const periodTotals = useMemo(
    () =>
      summarizeTransactionTotals(
        listTransactionsByDateFilter(currencyTransactions, dateFilter),
      ),
    [currencyTransactions, dateFilter],
  );
  // Lo que sobró de los periodos anteriores más lo del periodo: el balance
  // disponible al cerrarlo, con las recurrencias futuras ya proyectadas.
  const carryOver = usePeriodCarryOver({
    dateFilter,
    enabled: true,
    summarizeBalance: (carried) =>
      summarizeTransactionTotals(carried).balanceMinor,
    transactions: currencyTransactions,
  });
  const balanceMinor = carryOver.currentMinor + periodTotals.balanceMinor;
  const previousPeriodTotals = useMemo(() => {
    const previousFilter = showComparisonIndicators
      ? getPreviousDateFilter(dateFilter)
      : null;
    if (!previousFilter) {
      return null;
    }

    return summarizeTransactionTotals(
      listTransactionsByDateFilter(currencyTransactions, previousFilter),
    );
  }, [currencyTransactions, dateFilter, showComparisonIndicators]);
  const incomeComparison = previousPeriodTotals
    ? (calculatePeriodComparison(
        periodTotals.incomeMinor,
        previousPeriodTotals.incomeMinor,
      ) ?? undefined)
    : undefined;
  const expenseComparison = previousPeriodTotals
    ? (calculatePeriodComparison(
        periodTotals.expenseMinor,
        previousPeriodTotals.expenseMinor,
      ) ?? undefined)
    : undefined;

  return {
    balanceMinor,
    dateFilter,
    expenseComparison,
    incomeComparison,
    periodContext,
    periodTotals,
    setDateFilter,
  };
}
