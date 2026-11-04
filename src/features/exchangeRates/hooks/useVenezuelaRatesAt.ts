import { useEffect, useState } from 'react';

import { getVenezuelaRatesAt } from '@/features/exchangeRates/gateways/juntossVenezuelaRateHistoryGateway';
import type { VenezuelaRatesAt } from '@/features/exchangeRates/types';
import { reportBackgroundFailure } from '@/lib/diagnostics/backgroundFailure';

/**
 * Tasas BCV $, BCV € y USDT de un día (y una hora, si la hay). `undefined`
 * mientras carga o si está desactivado; `null` si la consulta falló.
 */
export function useVenezuelaRatesAt({
  date,
  enabled,
  time,
}: {
  date: string;
  enabled: boolean;
  time?: string;
}): VenezuelaRatesAt | null | undefined {
  const [result, setResult] = useState<{
    key: string;
    rates: VenezuelaRatesAt | null;
  } | null>(null);
  const key = `${date}|${time ?? ''}`;

  useEffect(() => {
    if (!enabled) return;
    let isCurrent = true;
    getVenezuelaRatesAt(date, time)
      .then((rates) => {
        if (isCurrent) setResult({ key, rates });
      })
      .catch((error: unknown) => {
        reportBackgroundFailure(
          '[exchangeRates] No se pudieron obtener las tasas de esa fecha',
          error,
        );
        if (isCurrent) setResult({ key, rates: null });
      });
    return () => {
      isCurrent = false;
    };
  }, [date, enabled, key, time]);

  if (!enabled || result?.key !== key) return undefined;
  return result.rates;
}
