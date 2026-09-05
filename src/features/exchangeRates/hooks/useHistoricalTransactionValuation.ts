import { useMemo, useState } from 'react';

import {
  getAvailableExchangeRateSources,
  getDefaultExchangeRateSource,
  summarizeHistoricalTransactions,
} from '@/features/exchangeRates/utils/transactionSnapshot';
import type { SessionTransaction } from '@/features/transactions/types';
import type { ExchangeRateSource } from '@/lib/currency/exchangeRateSource';

const sourceOrder: readonly ExchangeRateSource[] = ['BCV', 'EURO', 'CUSTOM'];

export function useHistoricalTransactionValuation(
  transactions: readonly SessionTransaction[],
) {
  const [selectedSource, setSelectedSource] =
    useState<ExchangeRateSource | null>(null);
  const availableSources = useMemo(() => {
    const sources = new Set<ExchangeRateSource>();
    transactions.forEach((transaction) =>
      getAvailableExchangeRateSources(transaction).forEach((source) =>
        sources.add(source),
      ),
    );
    return sourceOrder.filter((source) => sources.has(source));
  }, [transactions]);
  const source =
    selectedSource && availableSources.includes(selectedSource)
      ? selectedSource
      : getDefaultExchangeRateSource(availableSources);
  const summary = useMemo(
    () =>
      source ? summarizeHistoricalTransactions(transactions, source) : null,
    [source, transactions],
  );

  return {
    availableSources,
    selectedSource: source,
    setSelectedSource,
    summary,
  };
}
