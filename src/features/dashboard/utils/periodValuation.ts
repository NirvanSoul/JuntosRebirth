import {
  getCurrentBolivarRate,
  type VenezuelaBolivarRates,
  type VenezuelaDisplayMode,
} from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
import { summarizeTransactionTotals } from '@/features/transactions/utils/transactionSummary';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type PeriodEffectiveMetrics = {
  currency: CurrencyCode;
  totalMinor: number;
};

export function computePeriodValuation({
  bcvRate,
  eurRate,
  mode,
  transactions,
  type,
  usdtRate,
}: VenezuelaBolivarRates & {
  mode: VenezuelaDisplayMode;
  transactions: readonly SessionTransaction[];
  type: 'income' | 'expense' | 'balance';
}): PeriodEffectiveMetrics {
  let totalUsdExpense = 0;
  let totalUsdIncome = 0;

  for (const t of transactions) {
    let usdMinor = t.amountMinor;

    if (t.currency === 'VES') {
      const snapRate = t.exchangeSnapshot?.rates.BCV?.rate
        ? Number(t.exchangeSnapshot.rates.BCV.rate)
        : null;
      const rateToUse = snapRate ?? bcvRate;
      if (rateToUse && rateToUse > 0) {
        usdMinor = Math.round(t.amountMinor / rateToUse);
      }
    }

    if (t.type === 'expense') {
      totalUsdExpense += usdMinor;
    } else if (t.type === 'income') {
      totalUsdIncome += usdMinor;
    }
  }

  const usdTotal =
    type === 'income'
      ? totalUsdIncome
      : type === 'expense'
        ? totalUsdExpense
        : totalUsdIncome - totalUsdExpense;

  if (mode === 'USD') {
    return {
      currency: 'USD',
      totalMinor: usdTotal,
    };
  }

  const rate = getCurrentBolivarRate(mode, { bcvRate, eurRate, usdtRate });
  return {
    currency: 'VES',
    totalMinor: Math.round(usdTotal * rate),
  };
}

/**
 * Total de un periodo tal como lo muestra su detalle: en modo Venezuela,
 * valorado con las tasas; si no, solo los movimientos de `currency`.
 */
export function summarizePeriodTotalMinor({
  currency,
  transactions,
  type,
  valuation,
}: {
  currency: CurrencyCode;
  transactions: readonly SessionTransaction[];
  type: 'income' | 'expense' | 'balance';
  valuation: (VenezuelaBolivarRates & { mode: VenezuelaDisplayMode }) | null;
}): number {
  if (valuation) {
    return computePeriodValuation({ ...valuation, transactions, type })
      .totalMinor;
  }

  const totals = summarizeTransactionTotals(
    transactions.filter((transaction) => transaction.currency === currency),
  );
  if (type === 'income') return totals.incomeMinor;
  return type === 'expense' ? totals.expenseMinor : totals.balanceMinor;
}
