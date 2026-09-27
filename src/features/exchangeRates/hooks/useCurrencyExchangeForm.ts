import { useCallback, useState } from 'react';

import { useExchangeRates } from '@/features/exchangeRates/hooks/useExchangeRates';
import {
  canSubmitCurrencyExchange,
  createCurrencyExchangeFormState,
  deriveCurrencyExchangeSubmission,
  formatExchangeRateInput,
  reduceCurrencyExchangeForm,
  resolveExchangeRate,
  type CurrencyExchangeFormAction,
  type CurrencyExchangeFormState,
  type OfficialExchangeRates,
} from '@/features/exchangeRates/utils/currencyExchangeForm';
import { useDepsChanged } from '@/hooks/useDepsChanged';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';

const allRateSources: readonly ExchangeRateSource[] = ['BCV', 'EURO', 'CUSTOM'];
const customOnlySources: readonly ExchangeRateSource[] = ['CUSTOM'];

/**
 * Estado del modal «Comprar / vender dólares»: el reducer puro más la tasa
 * vigente del backend. Se reinicia cada vez que el modal se abre y, si el
 * backend no responde, deja solo la tasa personalizada disponible.
 */
export function useCurrencyExchangeForm({ visible }: { visible: boolean }) {
  const ratesState = useExchangeRates({ enabled: visible });
  const officialRates: OfficialExchangeRates =
    ratesState.status === 'success' || ratesState.status === 'stale'
      ? ratesState.rates.rates
      : null;
  const [state, setState] = useState<CurrencyExchangeFormState>(
    createCurrencyExchangeFormState,
  );

  const dispatch = useCallback(
    (action: CurrencyExchangeFormAction) => {
      setState((current) =>
        reduceCurrencyExchangeForm(current, action, officialRates),
      );
    },
    [officialRates],
  );

  if (useDepsChanged([visible]) && visible) {
    setState(createCurrencyExchangeFormState());
  }

  if (useDepsChanged([ratesState.status])) {
    if (ratesState.status === 'error') {
      dispatch({ type: 'ratesUnavailable' });
    } else if (officialRates) {
      // La persona pudo escribir mientras cargaba la tasa: al llegar, el
      // campo derivado se completa sin tocar lo que ya escribió.
      dispatch({ type: 'selectRateSource', source: state.rateSource });
    }
  }

  const rate = resolveExchangeRate(state, officialRates);

  return {
    availableSources:
      ratesState.status === 'error' ? customOnlySources : allRateSources,
    canSubmit: canSubmitCurrencyExchange(state, officialRates),
    dispatch,
    /** Valor del recuadro de tasa: el escrito a mano o el vigente de la fuente. */
    rateInputValue:
      state.rateSource === 'CUSTOM'
        ? state.customRateInput
        : rate === null
          ? ''
          : formatExchangeRateInput(rate),
    /** Solo se explica lo excepcional: cargando, sin tasa o tasa no fresca. */
    rateNotice: describeRateNotice(state, ratesState.status),
    ratesStatus: ratesState.status,
    state,
    submission: deriveCurrencyExchangeSubmission(state),
  };
}

function describeRateNotice(
  state: CurrencyExchangeFormState,
  status: ReturnType<typeof useExchangeRates>['status'],
): string {
  if (state.rateSource === 'CUSTOM') {
    return status === 'error'
      ? 'No pudimos leer la tasa del BCV. Escribe la que aplicaste.'
      : '';
  }
  if (status === 'loading') return 'Cargando la tasa de hoy…';
  if (status === 'stale') return 'Tasa no actualizada hoy.';

  return '';
}
