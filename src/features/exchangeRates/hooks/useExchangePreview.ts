import { useEffect, useRef, useState } from 'react';

import { previewExchangeRate } from '@/features/exchangeRates/gateways/juntossExchangeRateGateway';
import type {
  ExchangeRatePreview,
  VenezuelaCurrencyCode,
} from '@/features/exchangeRates/types';

/** Sección 8 del plan: ni tan corto que sature la API, ni tan largo que se note. */
const debounceMs = 400;

export type ExchangePreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success' | 'stale';
      convertedAmountMinor: number;
      toCurrency: VenezuelaCurrencyCode;
      rate: string;
      ratesUpdatedAt: string;
      conversions: ExchangeRatePreview['conversions'];
    }
  | { status: 'error' };

/**
 * Conversión en vivo mientras la persona escribe (secciones 7-9 del plan).
 * Solo BCV existe hoy en el backend, así que la moneda de destino es
 * siempre la otra de las dos únicas soportadas — no hace falta que el
 * llamador la indique.
 */
export function useExchangePreview({
  amountMinor,
  fromCurrency,
}: {
  amountMinor: number;
  fromCurrency: VenezuelaCurrencyCode;
}): ExchangePreviewState {
  const [state, setState] = useState<ExchangePreviewState>({
    status: 'idle',
  });
  /** Descarta una respuesta si ya se disparó un preview más reciente. */
  const requestId = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia a idle en cada cambio de importe
      setState({ status: 'idle' });
      return;
    }

    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    setState({ status: 'loading' });

    const timeoutId = setTimeout(() => {
      void previewExchangeRate({
        amountMinor,
        fromCurrency,
      })
        .then((preview) => {
          if (requestId.current !== currentRequestId) return;
          const bcv = preview.conversions.BCV;
          setState({
            status: 'success',
            convertedAmountMinor: bcv.amountMinor,
            toCurrency: bcv.currency as VenezuelaCurrencyCode,
            rate: bcv.rate,
            ratesUpdatedAt: preview.ratesUpdatedAt,
            conversions: preview.conversions,
          });
        })
        .catch((error: unknown) => {
          if (requestId.current !== currentRequestId) return;
          console.error(
            '[exchangeRates] No se pudo obtener el preview de conversión',
            error,
          );
          setState({ status: 'error' });
        });
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [amountMinor, fromCurrency]);

  return state;
}
