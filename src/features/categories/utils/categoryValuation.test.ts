import type { SessionTransaction } from '@/features/transactions/types';
import { computeCategoryMetrics } from '@/features/categories/utils/categoryValuation';

describe('categoryValuation', () => {
  const baseTransaction: SessionTransaction = {
    id: 'tx-1',
    spaceId: 'personal',
    categoryId: 'food',
    createdBy: 'user-1',
    occurredOn: '2026-09-01',
    recurrence: 'once',
    type: 'expense',
    title: 'Comida',
    amountMinor: 2000, // $20.00
    currency: 'USD',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  it('calcula métricas directas para usuario internacional', () => {
    const metrics = computeCategoryMetrics({
      bcvRate: null,
      eurRate: null,
      mode: 'USD',
      selectedCurrency: 'USD',
      transactions: [baseTransaction],
      venezuelaCurrencyMode: false,
    });

    expect(metrics).toEqual({
      currency: 'USD',
      expenseMinor: 2000,
      incomeMinor: 0,
    });
  });

  it('en modo Venezuela, calcula y convierte entre USD, VES_BCV y EUR usando tasas del día', () => {
    const vesTransaction: SessionTransaction = {
      ...baseTransaction,
      id: 'tx-2',
      amountMinor: 50000, // Bs. 500.00
      currency: 'VES',
      exchangeSnapshot: {
        countryCode: 'VE',
        createdWithCurrency: 'VES',
        rates: {
          BCV: {
            baseCurrency: 'USD',
            quoteCurrency: 'VES',
            rate: '50',
            convertedAmountMinor: 1000, // $10.00
            convertedCurrency: 'USD',
            observedAt: '2026-09-01T04:00:00.000Z',
          },
        },
      },
    };

    // Total en USD = $20 (tx-1) + $10 (tx-2 convertida a 50) = $30 (3000 minor)
    const usdMetrics = computeCategoryMetrics({
      bcvRate: 100, // Hoy la tasa es 100
      eurRate: 110,
      mode: 'USD',
      selectedCurrency: 'USD',
      transactions: [baseTransaction, vesTransaction],
      venezuelaCurrencyMode: true,
    });
    expect(usdMetrics).toEqual({
      currency: 'USD',
      expenseMinor: 3000,
      incomeMinor: 0,
    });

    // En VES_BCV: 30 USD * 100 = 3000 VES (300000 minor)
    const vesMetrics = computeCategoryMetrics({
      bcvRate: 100,
      eurRate: 110,
      mode: 'VES_BCV',
      selectedCurrency: 'USD',
      transactions: [baseTransaction, vesTransaction],
      venezuelaCurrencyMode: true,
    });
    expect(vesMetrics).toEqual({
      currency: 'VES',
      expenseMinor: 300000,
      incomeMinor: 0,
    });

    // En EUR: 30 USD * 110 = 3300 VES (330000 minor)
    const eurMetrics = computeCategoryMetrics({
      bcvRate: 100,
      eurRate: 110,
      mode: 'EUR',
      selectedCurrency: 'USD',
      transactions: [baseTransaction, vesTransaction],
      venezuelaCurrencyMode: true,
    });
    expect(eurMetrics).toEqual({
      currency: 'VES',
      expenseMinor: 330000,
      incomeMinor: 0,
    });
  });
});
