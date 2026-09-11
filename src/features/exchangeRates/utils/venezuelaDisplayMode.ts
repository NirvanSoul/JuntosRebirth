import type {
  TransactionExchangeSnapshot,
  ExchangeSnapshotRate,
} from '@/features/transactions/types';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';
import { getExchangeRateSourceLabel } from '@/lib/currency/exchangeRateSource';
import { formatExchangeRate } from '@/lib/currency/formatCurrency';

export type VenezuelaDisplayMode = 'USD' | 'VES_BCV' | 'EUR';

export type VenezuelaDisplayValue = {
  amountMinor: number;
  currency: CurrencyCode;
  rate: ExchangeSnapshotRate | null;
  source: 'BCV' | 'EURO' | null;
};

/**
 * Resuelve una lectura histórica sin recalcular nunca contra la tasa actual.
 * El importe original se conserva como salida cuando ya está en el modo pedido.
 */
export function getVenezuelaDisplayValue({
  amountMinor,
  accountingAmountMinorUsd,
  currency,
  exchangeSnapshot,
  mode,
}: {
  amountMinor: number;
  accountingAmountMinorUsd?: number | null;
  currency: CurrencyCode;
  exchangeSnapshot: TransactionExchangeSnapshot;
  mode: VenezuelaDisplayMode;
}): VenezuelaDisplayValue | null {
  if (mode === 'USD') {
    const usdAmountMinor =
      currency === 'USD' ? amountMinor : accountingAmountMinorUsd;

    return typeof usdAmountMinor === 'number'
      ? {
          amountMinor: usdAmountMinor,
          currency: 'USD',
          rate: null,
          source: null,
        }
      : null;
  }
  if (mode === 'VES_BCV' && currency === 'VES') {
    return { amountMinor, currency: 'VES', rate: null, source: null };
  }

  const source = mode === 'EUR' ? 'EURO' : 'BCV';
  const rate = exchangeSnapshot.rates[source];
  // En Venezuela, «EUR» es la referencia EUR/VES del BCV, no una moneda de
  // salida. Ambos modos de tasa muestran el equivalente histórico en VES.
  const expectedCurrency = 'VES';

  if (!rate || rate.convertedCurrency !== expectedCurrency) return null;

  return {
    amountMinor: rate.convertedAmountMinor,
    currency: expectedCurrency,
    rate,
    source,
  };
}

export function getHistoricalRateDescription(
  displayValue: VenezuelaDisplayValue,
): string {
  if (!displayValue.rate || !displayValue.source) return 'Importe original';

  const { baseCurrency, observedAt, quoteCurrency, rate } = displayValue.rate;
  const source = getExchangeRateSourceLabel(displayValue.source);
  const formattedDate = observedAt
    ? new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(observedAt))
    : null;
  const formattedRate =
    isCurrencyCode(baseCurrency) && isCurrencyCode(quoteCurrency)
      ? formatExchangeRate(rate, baseCurrency, quoteCurrency, 'es-ES')
      : source;

  return formattedDate
    ? `${source} · ${formattedRate} · ${formattedDate}`
    : `${source} · ${formattedRate}`;
}
