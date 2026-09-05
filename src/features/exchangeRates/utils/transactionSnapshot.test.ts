import type { SessionTransaction } from '@/features/transactions/types';

import {
  getAvailableExchangeRateSources,
  summarizeHistoricalTransactions,
} from './transactionSnapshot';

const usdExpense: SessionTransaction = {
  id: 'usd-expense',
  createdBy: 'user',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 1_000,
  currency: 'USD',
  title: 'Compra',
  categoryId: 'food',
  occurredOn: '2026-09-04',
  recurrence: 'once',
  updatedAt: '2026-09-04T12:00:00.000Z',
  exchangeSnapshot: {
    countryCode: 'VE',
    createdWithCurrency: 'USD',
    rates: {
      BCV: {
        baseCurrency: 'USD',
        quoteCurrency: 'VES',
        rate: '50.0000000000',
        convertedAmountMinor: 50_000,
        observedAt: '2026-09-04T04:00:00.000Z',
      },
      EURO: {
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        rate: '0.91',
        convertedAmountMinor: 910,
        observedAt: '2026-09-04T04:00:00.000Z',
      },
    },
  },
};

describe('transactionSnapshot', () => {
  it('expone únicamente las fuentes guardadas, en el orden de la interfaz', () => {
    expect(getAvailableExchangeRateSources(usdExpense)).toEqual([
      'BCV',
      'EURO',
    ]);
  });

  it('suma solo snapshots congelados y cuenta los movimientos sin conversión', () => {
    const summary = summarizeHistoricalTransactions(
      [
        usdExpense,
        { ...usdExpense, id: 'usd-income', type: 'income' },
        {
          ...usdExpense,
          id: 'legacy',
          exchangeSnapshot: null,
        },
      ],
      'BCV',
    );

    expect(summary).toEqual({
      currency: 'VES',
      expenseMinor: 50_000,
      incomeMinor: 50_000,
      convertedTransactionCount: 2,
      missingTransactionCount: 1,
    });
  });

  it('no mezcla monedas de destino en un mismo total', () => {
    const summary = summarizeHistoricalTransactions(
      [
        usdExpense,
        {
          ...usdExpense,
          id: 'inconsistent-snapshot',
          exchangeSnapshot: {
            ...usdExpense.exchangeSnapshot!,
            rates: {
              BCV: {
                ...usdExpense.exchangeSnapshot!.rates.BCV!,
                quoteCurrency: 'EUR',
                convertedAmountMinor: 900,
              },
            },
          },
        },
      ],
      'BCV',
    );

    expect(summary).toMatchObject({
      currency: 'VES',
      expenseMinor: 50_000,
      convertedTransactionCount: 1,
      missingTransactionCount: 1,
    });
  });
});
