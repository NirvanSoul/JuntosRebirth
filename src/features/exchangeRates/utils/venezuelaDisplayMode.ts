import type {
  TransactionExchangeSnapshot,
  ExchangeSnapshotRate,
} from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

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
  currency,
  exchangeSnapshot,
  mode,
}: {
  amountMinor: number;
  currency: CurrencyCode;
  exchangeSnapshot: TransactionExchangeSnapshot;
  mode: VenezuelaDisplayMode;
}): VenezuelaDisplayValue | null {
  if (mode === 'USD' && currency === 'USD') {
    return { amountMinor, currency: 'USD', rate: null, source: null };
  }
  if (mode === 'VES_BCV' && currency === 'VES') {
    return { amountMinor, currency: 'VES', rate: null, source: null };
  }

  const source = mode === 'EUR' ? 'EURO' : 'BCV';
  const rate = exchangeSnapshot.rates[source];
  const expectedCurrency =
    mode === 'USD' ? 'USD' : mode === 'VES_BCV' ? 'VES' : 'EUR';

  if (!rate || rate.convertedCurrency !== expectedCurrency) return null;

  return {
    amountMinor: rate.convertedAmountMinor,
    currency: expectedCurrency,
    rate,
    source,
  };
}
