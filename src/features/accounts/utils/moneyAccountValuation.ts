import type { MoneyAccountCurrencyBalance } from '@/features/accounts/utils/moneyAccountSummary';
import type { HistoricalTransactionSummary } from '@/features/exchangeRates/utils/transactionSnapshot';
import type { VenezuelaDisplayMode } from '@/features/exchangeRates/utils/venezuelaDisplayMode';
import type { SessionTransaction } from '@/features/transactions/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type EffectiveAccountBalance = {
  balanceMinor: number;
  currency: CurrencyCode;
  expenseMinor: number;
  incomeMinor: number;
};

export type ExchangeRatePair = {
  bcvRate: number | null;
  eurRate: number | null;
  usdtRate?: number | null;
};

export function extractRatesFromTransactions(
  transactions: readonly SessionTransaction[],
): ExchangeRatePair {
  let bcvRate: number | null = null;
  let eurRate: number | null = null;
  let usdtRate: number | null = null;

  for (const transaction of transactions) {
    const rates = transaction.exchangeSnapshot?.rates;
    if (!rates) continue;
    if (bcvRate === null && rates.BCV?.rate && Number(rates.BCV.rate) > 0) {
      bcvRate = Number(rates.BCV.rate);
    }
    if (eurRate === null && rates.EURO?.rate && Number(rates.EURO.rate) > 0) {
      eurRate = Number(rates.EURO.rate);
    }
    if (usdtRate === null && Number(rates.USDT?.rate) > 0) {
      usdtRate = Number(rates.USDT!.rate);
    }
    if (bcvRate !== null && eurRate !== null && usdtRate !== null) break;
  }

  return { bcvRate, eurRate, usdtRate };
}

export function computeEffectiveAccountBalance({
  balance,
  bcvSummary,
  eurSummary,
  mode,
  rates,
  usdtSummary,
}: {
  balance: MoneyAccountCurrencyBalance;
  bcvSummary?: HistoricalTransactionSummary | null;
  eurSummary?: HistoricalTransactionSummary | null;
  mode: VenezuelaDisplayMode;
  rates?: ExchangeRatePair;
  usdtSummary?: HistoricalTransactionSummary | null;
}): EffectiveAccountBalance {
  const bcv = rates?.bcvRate && rates.bcvRate > 0 ? rates.bcvRate : null;
  const eur = rates?.eurRate && rates.eurRate > 0 ? rates.eurRate : null;
  const usdt = rates?.usdtRate && rates.usdtRate > 0 ? rates.usdtRate : null;

  if (mode === 'USD') {
    if (balance.currency === 'USD') {
      return {
        balanceMinor: balance.balanceMinor,
        currency: 'USD',
        expenseMinor: balance.expenseMinor,
        incomeMinor: balance.incomeMinor,
      };
    }

    if (bcv) {
      return {
        balanceMinor: Math.round(balance.balanceMinor / bcv),
        currency: 'USD',
        expenseMinor: Math.round(balance.expenseMinor / bcv),
        incomeMinor: Math.round(balance.incomeMinor / bcv),
      };
    }

    return {
      balanceMinor: balance.balanceMinor,
      currency: balance.currency,
      expenseMinor: balance.expenseMinor,
      incomeMinor: balance.incomeMinor,
    };
  }

  if (mode === 'VES_BCV') {
    if (balance.currency === 'VES') {
      return {
        balanceMinor: balance.balanceMinor,
        currency: 'VES',
        expenseMinor: balance.expenseMinor,
        incomeMinor: balance.incomeMinor,
      };
    }

    const conversionRate = bcv ?? 1;
    const expenseMinor =
      bcvSummary?.expenseMinor ??
      Math.round(balance.expenseMinor * conversionRate);
    const incomeMinor =
      bcvSummary?.incomeMinor ??
      Math.round(balance.incomeMinor * conversionRate);
    const balanceMinor = Math.round(balance.balanceMinor * conversionRate);

    return {
      balanceMinor,
      currency: 'VES',
      expenseMinor,
      incomeMinor,
    };
  }

  // mode === 'EUR' (referencia EUR/VES del BCV) o 'VES_USDT' (1 USDT en Bs):
  // ambos valoran en bolívares con su propia tasa.
  const modeRate = mode === 'EUR' ? eur : usdt;
  const modeSummary = mode === 'EUR' ? eurSummary : usdtSummary;
  if (balance.currency === 'USD') {
    const conversionRate = modeRate ?? bcv ?? 1;
    const expenseMinor =
      modeSummary?.expenseMinor ??
      Math.round(balance.expenseMinor * conversionRate);
    const incomeMinor =
      modeSummary?.incomeMinor ??
      Math.round(balance.incomeMinor * conversionRate);
    const balanceMinor = Math.round(balance.balanceMinor * conversionRate);

    return {
      balanceMinor,
      currency: 'VES',
      expenseMinor,
      incomeMinor,
    };
  }

  // balance.currency === 'VES'
  const factor = bcv && modeRate ? modeRate / bcv : 1;
  return {
    balanceMinor: Math.round(balance.balanceMinor * factor),
    currency: 'VES',
    expenseMinor: Math.round(balance.expenseMinor * factor),
    incomeMinor: Math.round(balance.incomeMinor * factor),
  };
}

export function computeCombinedAccountBalance({
  balances,
  bcvSummary,
  eurSummary,
  mode,
  rates,
  usdtSummary,
}: {
  balances: readonly MoneyAccountCurrencyBalance[];
  bcvSummary?: HistoricalTransactionSummary | null;
  eurSummary?: HistoricalTransactionSummary | null;
  mode: VenezuelaDisplayMode;
  rates?: ExchangeRatePair;
  usdtSummary?: HistoricalTransactionSummary | null;
}): EffectiveAccountBalance {
  if (balances.length === 0) {
    return {
      balanceMinor: 0,
      currency: mode === 'USD' ? 'USD' : 'VES',
      expenseMinor: 0,
      incomeMinor: 0,
    };
  }

  let totalBalanceMinor = 0;
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;
  const targetCurrency: CurrencyCode = mode === 'USD' ? 'USD' : 'VES';

  for (const b of balances) {
    const eff = computeEffectiveAccountBalance({
      balance: b,
      bcvSummary,
      eurSummary,
      mode,
      rates,
      usdtSummary,
    });
    totalBalanceMinor += eff.balanceMinor;
    totalIncomeMinor += eff.incomeMinor;
    totalExpenseMinor += eff.expenseMinor;
  }

  return {
    balanceMinor: totalBalanceMinor,
    currency: targetCurrency,
    expenseMinor: totalExpenseMinor,
    incomeMinor: totalIncomeMinor,
  };
}
