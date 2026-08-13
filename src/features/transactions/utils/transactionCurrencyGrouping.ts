import type { SessionTransaction } from '@/features/transactions/types';
import {
  defaultCurrencyCode,
  type CurrencyCode,
} from '@/lib/currency/currencyCatalog';

export function getAvailableCurrencies(
  transactions: readonly SessionTransaction[],
): CurrencyCode[] {
  return Array.from(
    new Set(transactions.map((transaction) => transaction.currency)),
  ).sort();
}

export function groupTransactionsByCurrency(
  transactions: readonly SessionTransaction[],
): Map<CurrencyCode, SessionTransaction[]> {
  const grouped = new Map<CurrencyCode, SessionTransaction[]>();

  transactions.forEach((transaction) => {
    const group = grouped.get(transaction.currency);

    if (group) {
      group.push(transaction);
    } else {
      grouped.set(transaction.currency, [transaction]);
    }
  });

  return grouped;
}

export function pickEffectiveCurrency(
  available: readonly CurrencyCode[],
  selected: CurrencyCode | null | undefined,
  fallback: CurrencyCode = defaultCurrencyCode,
): CurrencyCode {
  return (
    (selected && available.includes(selected) ? selected : available[0]) ??
    fallback
  );
}
