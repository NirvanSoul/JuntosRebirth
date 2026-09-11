import {
  computeEffectiveAccountBalance,
  extractRatesFromTransactions,
} from './moneyAccountValuation';
import type { MoneyAccountCurrencyBalance } from './moneyAccountSummary';
import type { SessionTransaction } from '@/features/transactions/types';

describe('moneyAccountValuation', () => {
  const balanceUSD: MoneyAccountCurrencyBalance = {
    currency: 'USD',
    balanceMinor: 10_000, // $100.00
    previousMonthBalanceMinor: 0,
    hasPreviousMonthTransaction: false,
    incomeMinor: 15_000,
    expenseMinor: 5_000,
    transactionCount: 2,
  };

  const balanceVES: MoneyAccountCurrencyBalance = {
    currency: 'VES',
    balanceMinor: 500_000, // Bs. 5000.00
    previousMonthBalanceMinor: 0,
    hasPreviousMonthTransaction: false,
    incomeMinor: 600_000,
    expenseMinor: 100_000,
    transactionCount: 2,
  };

  const rates = {
    bcvRate: 50,
    eurRate: 60,
  };

  describe('extractRatesFromTransactions', () => {
    it('extrae las tasas BCV y EURO de los snapshots de los movimientos', () => {
      const transactions = [
        {
          id: '1',
          exchangeSnapshot: {
            countryCode: 'VE',
            createdWithCurrency: 'USD',
            rates: {
              BCV: {
                baseCurrency: 'USD',
                quoteCurrency: 'VES',
                rate: '50.25',
                convertedAmountMinor: 5025,
                observedAt: null,
              },
              EURO: {
                baseCurrency: 'USD',
                quoteCurrency: 'VES',
                rate: '60.10',
                convertedAmountMinor: 6010,
                observedAt: null,
              },
            },
          },
        } as unknown as SessionTransaction,
      ];

      expect(extractRatesFromTransactions(transactions)).toEqual({
        bcvRate: 50.25,
        eurRate: 60.1,
      });
    });
  });

  describe('computeEffectiveAccountBalance', () => {
    it('mantiene USD sin cambios en modo USD', () => {
      const result = computeEffectiveAccountBalance({
        balance: balanceUSD,
        mode: 'USD',
        rates,
      });
      expect(result).toEqual({
        balanceMinor: 10_000,
        currency: 'USD',
        incomeMinor: 15_000,
        expenseMinor: 5_000,
      });
    });

    it('convierte saldo USD a VES en modo VES_BCV', () => {
      const result = computeEffectiveAccountBalance({
        balance: balanceUSD,
        mode: 'VES_BCV',
        rates,
      });
      expect(result).toEqual({
        balanceMinor: 500_000, // 10_000 * 50
        currency: 'VES',
        incomeMinor: 750_000, // 15_000 * 50
        expenseMinor: 250_000, // 5_000 * 50
      });
    });

    it('convierte saldo USD a VES en modo EUR', () => {
      const result = computeEffectiveAccountBalance({
        balance: balanceUSD,
        mode: 'EUR',
        rates,
      });
      expect(result).toEqual({
        balanceMinor: 600_000, // 10_000 * 60
        currency: 'VES',
        incomeMinor: 900_000,
        expenseMinor: 300_000,
      });
    });

    it('convierte saldo VES a USD en modo USD', () => {
      const result = computeEffectiveAccountBalance({
        balance: balanceVES,
        mode: 'USD',
        rates,
      });
      expect(result).toEqual({
        balanceMinor: 10_000, // 500_000 / 50
        currency: 'USD',
        incomeMinor: 12_000,
        expenseMinor: 2_000,
      });
    });
  });
});
