import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type CategoryEffectiveMetrics = {
  currency: CurrencyCode;
  expenseMinor: number;
  incomeMinor: number;
};

export function computeCategoryMetrics({
  bcvRate,
  eurRate,
  mode,
  selectedCurrency,
  transactions,
  venezuelaCurrencyMode,
}: {
  bcvRate: number | null;
  eurRate: number | null;
  mode: VenezuelaDisplayMode;
  selectedCurrency: CurrencyCode;
  transactions: readonly SessionTransaction[];
  venezuelaCurrencyMode: boolean;
}): CategoryEffectiveMetrics {
  if (venezuelaCurrencyMode) {
    let totalUsdExpense = 0;
    let totalUsdIncome = 0;

    for (const t of transactions) {
      const isExpense = t.type === 'expense';
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

      if (isExpense) {
        totalUsdExpense += usdMinor;
      } else {
        totalUsdIncome += usdMinor;
      }
    }

    if (mode === 'USD') {
      return {
        currency: 'USD',
        expenseMinor: totalUsdExpense,
        incomeMinor: totalUsdIncome,
      };
    }

    if (mode === 'VES_BCV') {
      const activeBcvRate = bcvRate && bcvRate > 0 ? bcvRate : 1;
      return {
        currency: 'VES',
        expenseMinor: Math.round(totalUsdExpense * activeBcvRate),
        incomeMinor: Math.round(totalUsdIncome * activeBcvRate),
      };
    }

    // mode === 'EUR'
    const activeEurRate =
      eurRate && eurRate > 0 ? eurRate : bcvRate && bcvRate > 0 ? bcvRate : 1;
    return {
      currency: 'VES',
      expenseMinor: Math.round(totalUsdExpense * activeEurRate),
      incomeMinor: Math.round(totalUsdIncome * activeEurRate),
    };
  }

  let expenseMinor = 0;
  let incomeMinor = 0;
  for (const t of transactions) {
    if (t.currency !== selectedCurrency) continue;
    if (t.type === 'expense') {
      expenseMinor += t.amountMinor;
    } else {
      incomeMinor += t.amountMinor;
    }
  }

  return {
    currency: selectedCurrency,
    expenseMinor,
    incomeMinor,
  };
}
