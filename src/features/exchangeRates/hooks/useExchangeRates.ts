import { useEffect, useState } from 'react';

import {
  getCurrentExchangeRates,
  peekCurrentExchangeRates,
} from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
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
function toLoadedState(rates: CurrentExchangeRates): ExchangeRatesState {
  return { status: rates.stale ? 'stale' : 'success', rates };
}

export function useExchangeRates(options?: {
  enabled?: boolean;
}): ExchangeRatesState {
  const enabled = options?.enabled ?? true;
  const [state, setState] = useState<ExchangeRatesState>(() => {
    const cached = enabled ? peekCurrentExchangeRates() : null;
    return cached ? toLoadedState(cached) : { status: 'loading' };
  });

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    // Con tasas frescas en memoria la hoja abre ya con ellas, sin pasar por
    // `loading`; el análisis estático no distingue esto de un `setState` sin
    // frontera asíncrona.
    const cached = peekCurrentExchangeRates();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(cached ? toLoadedState(cached) : { status: 'loading' });
    if (cached) return;

    void getCurrentExchangeRates()
      .then((rates) => {
        if (isMounted) setState(toLoadedState(rates));
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
