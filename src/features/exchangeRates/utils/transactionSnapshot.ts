import type { SessionTransaction } from '@/features/transactions/types';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import {
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

const exchangeRateSourceOrder: readonly ExchangeRateSource[] = [
  'BCV',
  'EURO',
  'CUSTOM',
];

export type HistoricalTransactionSummary = {
  currency: CurrencyCode;
  expenseMinor: number;
  incomeMinor: number;
  convertedTransactionCount: number;
  missingTransactionCount: number;
};

export function getAvailableExchangeRateSources(
  transaction: Pick<SessionTransaction, 'exchangeSnapshot'>,
): readonly ExchangeRateSource[] {
  const rates = transaction.exchangeSnapshot?.rates;
  if (!rates) return [];

  return exchangeRateSourceOrder.filter(
    (source) => rates[source] !== undefined,
  );
}

export function getDefaultExchangeRateSource(
  sources: readonly ExchangeRateSource[],
): ExchangeRateSource | null {
  return sources[0] ?? null;
}

export function getSnapshotRate(
  transaction: Pick<SessionTransaction, 'exchangeSnapshot'>,
  source: ExchangeRateSource,
) {
  return transaction.exchangeSnapshot?.rates[source] ?? null;
}

/**
 * Suma exclusivamente conversiones congeladas por el servidor. Nunca usa la
 * tasa actual: así un total histórico no cambia al actualizarse el BCV.
 */
export function summarizeHistoricalTransactions(
  transactions: readonly SessionTransaction[],
  source: ExchangeRateSource,
): HistoricalTransactionSummary | null {
  let currency: CurrencyCode | null = null;
  let expenseMinor = 0;
  let incomeMinor = 0;
  let convertedTransactionCount = 0;
  let missingTransactionCount = 0;

  for (const transaction of transactions) {
    const rate = getSnapshotRate(transaction, source);
    if (!rate || !isCurrencyCode(rate.quoteCurrency)) {
      missingTransactionCount += 1;
      continue;
    }

    // Una pantalla solo agrupa una moneda de origen. Aun así, no mezclamos
    // destinos si un snapshot corrupto o futuro cambiara esa garantía.
    if (currency && currency !== rate.quoteCurrency) {
      missingTransactionCount += 1;
      continue;
    }

    currency = rate.quoteCurrency;
    convertedTransactionCount += 1;
    if (transaction.type === 'income') {
      incomeMinor += rate.convertedAmountMinor;
    } else {
      expenseMinor += rate.convertedAmountMinor;
    }
  }

  if (!currency) return null;

  return {
    currency,
    expenseMinor,
    incomeMinor,
    convertedTransactionCount,
    missingTransactionCount,
  };
}
