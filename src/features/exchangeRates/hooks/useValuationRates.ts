import { useMemo } from 'react';

import { extractRatesFromTransactions } from '@/features/accounts/utils/moneyAccountValuation';
import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import type { SessionTransaction } from '@/features/transactions/types';

export type ValuationRates = {
  bcvRate: number | null;
  eurRate: number | null;
  usdtRate: number | null;
};

function apiRate(rate: { rate: string } | null | undefined): number | null {
  const value = Number(rate?.rate);
  return value > 0 ? value : null;
}

/**
 * Tasas BCV, euro y USDT con las que se valoran hoy los totales de un modo en
 * bolívares: las del servicio cuando están disponibles y, si no, las guardadas
 * en `fallbackTransactions`. La consulta comparte la caché de
 * `useExchangeRates`, cuyo refresco cubre también la USDT, que cambia durante
 * el día.
 */
export function useValuationRates(
  fallbackTransactions: readonly SessionTransaction[],
  enabled: boolean,
): ValuationRates {
  const exchangeRatesState = useExchangeRates({ enabled });
  const apiRates =
    exchangeRatesState.status === 'success' ||
    exchangeRatesState.status === 'stale'
      ? exchangeRatesState.rates.rates
      : null;

  const fallbackRates = useMemo(
    () => extractRatesFromTransactions(fallbackTransactions),
    [fallbackTransactions],
  );

  return useMemo(
    () => ({
      bcvRate: apiRate(apiRates?.BCV) ?? fallbackRates.bcvRate,
      eurRate: apiRate(apiRates?.EURO) ?? fallbackRates.eurRate,
      usdtRate: apiRate(apiRates?.USDT) ?? fallbackRates.usdtRate ?? null,
    }),
    [apiRates, fallbackRates],
  );
}
