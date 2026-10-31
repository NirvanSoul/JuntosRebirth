import { summarizeMapMonthWithComparison } from '@/features/map/model/mapMonthTotals';
import type { SessionTransaction } from '@/features/transactions/types';

function transaction(
  id: string,
  type: SessionTransaction['type'],
  amountMinor: number,
  occurredOn: string,
  currency: SessionTransaction['currency'] = 'EUR',
): SessionTransaction {
  return {
    id,
    createdBy: 'install-test',
    spaceId: 'personal',
    type,
    amountMinor,
    currency,
    title: id,
    categoryId: 'general',
    occurredOn,
    recurrence: 'once',
    updatedAt: `${occurredOn}T12:00:00.000Z`,
  };
}

describe('summarizeMapMonthWithComparison', () => {
  it('compara el mes con el anterior arrastrando el balance', () => {
    const { comparisons, totals } = summarizeMapMonthWithComparison(
      [
        transaction('june-income', 'income', 1000, '2026-06-05'),
        transaction('june-expense', 'expense', 500, '2026-06-10'),
        transaction('july-income', 'income', 1100, '2026-07-05'),
        transaction('july-expense', 'expense', 800, '2026-07-10'),
        transaction('july-usd', 'expense', 9999, '2026-07-11', 'USD'),
      ],
      'EUR',
      '2026-07',
    );

    expect(totals).toEqual({
      balanceMinor: 800,
      expenseMinor: 800,
      incomeMinor: 1100,
    });
    expect(comparisons.income).toEqual({ changeMinor: 100, direction: 'up' });
    expect(comparisons.expense).toEqual({
      changeMinor: 300,
      direction: 'up',
    });
    expect(comparisons.balance).toEqual({
      changeMinor: 300,
      direction: 'up',
    });
  });

  it('no compara cuando el mes anterior no tiene actividad', () => {
    const { comparisons } = summarizeMapMonthWithComparison(
      [transaction('july-income', 'income', 1100, '2026-07-05')],
      'EUR',
      '2026-07',
    );

    expect(comparisons).toEqual({});
  });
});
