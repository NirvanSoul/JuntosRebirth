import { getFrozenBolivarAmount } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

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
    // Siempre en Bs: la fila EURO se congela en euros y no puede sumarse tal
    // cual como si fueran bolívares.
    const frozen = getFrozenBolivarAmount(transaction, source);
    if (!frozen) {
      missingTransactionCount += 1;
      continue;
    }

    currency = 'VES';
    convertedTransactionCount += 1;
    if (transaction.type === 'income') {
      incomeMinor += frozen.amountMinor;
    } else {
      expenseMinor += frozen.amountMinor;
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
