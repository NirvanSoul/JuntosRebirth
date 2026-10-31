import { useMemo } from 'react';

import { extractRatesFromTransactions } from '@/features/accounts/utils/moneyAccountValuation';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import type { SessionTransaction } from '@/features/transactions/types';

/**
 * Tasas BCV y euro para valorar el periodo: las del servicio cuando están
 * disponibles y, si no, las guardadas en los propios movimientos.
 */
export function usePeriodRates(
  transactions: readonly SessionTransaction[],
  enabled: boolean,
): { bcvRate: number | null; eurRate: number | null } {
  const exchangeRatesState = useExchangeRates({ enabled });
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const fallbackRates = useMemo(
    () => extractRatesFromTransactions(transactions),
    [transactions],
  );

  return {
    bcvRate: apiRates?.BCV?.rate
      ? Number(apiRates.BCV.rate)
      : fallbackRates.bcvRate,
    eurRate: apiRates?.EURO?.rate
      ? Number(apiRates.EURO.rate)
      : fallbackRates.eurRate,
  };
}
