import { computePeriodValuation } from '@/features/dashboard/utils/periodValuation';
import type { SessionTransaction } from '@/features/transactions/types';

function createTx(params: Partial<SessionTransaction>): SessionTransaction {
  return {
    amountMinor: 1000,
    categoryId: 'cat-1',
    createdBy: 'user-1',
    currency: 'USD',
    id: 'tx-1',
    occurredOn: '2026-09-01',
    recurrence: 'once',
    spaceId: 'space-1',
    title: 'Test',
    type: 'expense',
    updatedAt: '2026-09-01T12:00:00.000Z',
    ...params,
  };
}

describe('computePeriodValuation', () => {
  const transactions: SessionTransaction[] = [
    createTx({
      id: 'tx-usd-expense',
      type: 'expense',
      currency: 'USD',
      amountMinor: 2000, // $20.00
    }),
    createTx({
      id: 'tx-ves-expense',
      type: 'expense',
      currency: 'VES',
      amountMinor: 100000, // 1,000.00 VES, rate 50 -> $20.00
      exchangeSnapshot: {
        countryCode: 'VE',
        createdWithCurrency: 'VES',
        rates: {
          BCV: {
            baseCurrency: 'USD',
            convertedAmountMinor: 2000,
            observedAt: '2026-09-01T10:00:00.000Z',
            quoteCurrency: 'VES',
            rate: '50.00',
          },
        },
      },
    }),
    createTx({
      id: 'tx-usd-income',
      type: 'income',
      currency: 'USD',
      amountMinor: 10000, // $100.00
    }),
  ];

  it('calculates USD mode correctly', () => {
    const expenseMetrics = computePeriodValuation({
      bcvRate: 50,
      eurRate: 55,
      mode: 'USD',
      transactions,
      type: 'expense',
    });
    // $20 USD + $20 USD = $40 USD (4000 minor)
    expect(expenseMetrics).toEqual({
      currency: 'USD',
      totalMinor: 4000,
    });

    const incomeMetrics = computePeriodValuation({
      bcvRate: 50,
      eurRate: 55,
      mode: 'USD',
      transactions,
      type: 'income',
    });
    expect(incomeMetrics).toEqual({
      currency: 'USD',
      totalMinor: 10000,
    });

    const balanceMetrics = computePeriodValuation({
      bcvRate: 50,
      eurRate: 55,
      mode: 'USD',
      transactions,
      type: 'balance',
    });
    // 10000 - 4000 = 6000
    expect(balanceMetrics).toEqual({
      currency: 'USD',
      totalMinor: 6000,
    });
  });

  it('calculates VES_BCV mode correctly using active BCV rate', () => {
    const expenseMetrics = computePeriodValuation({
      bcvRate: 60,
      eurRate: 65,
      mode: 'VES_BCV',
      transactions,
      type: 'expense',
    });
    // 4000 minor USD * 60 = 240000 minor VES
    expect(expenseMetrics).toEqual({
      currency: 'VES',
      totalMinor: 240000,
    });
  });

  it('calculates EUR mode correctly using active EUR rate', () => {
    const expenseMetrics = computePeriodValuation({
      bcvRate: 60,
      eurRate: 65,
      mode: 'EUR',
      transactions,
      type: 'expense',
    });
    // 4000 minor USD * 65 = 260000 minor VES
    expect(expenseMetrics).toEqual({
      currency: 'VES',
      totalMinor: 260000,
    });
  });
});
