import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
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
}: {
  bcvRate: number | null;
  eurRate: number | null;
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

  if (mode === 'VES_BCV') {
    const activeBcvRate = bcvRate && bcvRate > 0 ? bcvRate : 1;
    return {
      currency: 'VES',
      totalMinor: Math.round(usdTotal * activeBcvRate),
    };
  }

  // mode === 'EUR'
  const activeEurRate =
    eurRate && eurRate > 0 ? eurRate : bcvRate && bcvRate > 0 ? bcvRate : 1;
  return {
    currency: 'VES',
    totalMinor: Math.round(usdTotal * activeEurRate),
  };
}
