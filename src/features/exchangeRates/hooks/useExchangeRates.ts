import { useEffect, useState } from 'react';

import { getCurrentExchangeRates } from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import type { CurrentExchangeRates } from '@/features/exchangeRates/types';

export type ExchangeRatesState =
  | { status: 'loading' }
  | { status: 'success' | 'stale'; rates: CurrentExchangeRates }
  | { status: 'error' };

/**
 * Tasa vigente de hoy (hora Venezuela) para el badge inicial, antes de que
 * la persona escriba un importe. `useExchangePreview` es quien resuelve la
 * conversión en vivo mientras escribe.
 */
export function useExchangeRates(options?: {
  enabled?: boolean;
}): ExchangeRatesState {
  const enabled = options?.enabled ?? true;
  const [state, setState] = useState<ExchangeRatesState>({
    status: 'loading',
  });

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    // Reinicia a `loading` al montar; el análisis estático
    // no distingue esto de un `setState` sin frontera asíncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });

    void getCurrentExchangeRates()
      .then((rates) => {
        if (isMounted) {
          setState({ status: rates.stale ? 'stale' : 'success', rates });
        }
      })
      .catch((error: unknown) => {
        console.error('[exchangeRates] No se pudo leer la tasa vigente', error);
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return state;
}
