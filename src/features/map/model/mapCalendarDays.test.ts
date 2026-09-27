import type { SessionTransaction } from '@/features/transactions/types';
import { indexMapCalendarDays } from '@/features/map/model/mapCalendarDays';

const expense: SessionTransaction = {
  id: 'expense',
  amountMinor: 1299,
  categoryId: 'food',
  createdBy: 'device',
  currency: 'EUR',
  occurredOn: '2026-08-12',
  recurrence: 'once',
  spaceId: 'personal',
  title: 'Comida',
  type: 'expense',
  updatedAt: '2026-08-12T12:00:00.000Z',
};

describe('indexMapCalendarDays', () => {
  it('agrupa los movimientos y conserva las marcas de ambos tipos', () => {
    const income: SessionTransaction = {
      ...expense,
      id: 'income',
      title: 'Nómina',
      type: 'income',
    };

    const days = indexMapCalendarDays([expense, income]);

    expect(days.get('2026-08-12')).toMatchObject({
      hasExpenses: true,
      hasIncomes: true,
    });
    expect(days.get('2026-08-12')?.transactions).toEqual([expense, income]);
  });

  it('mantiene los días separados', () => {
    const nextDay: SessionTransaction = {
      ...expense,
      id: 'next-day',
      occurredOn: '2026-08-13',
    };

    const days = indexMapCalendarDays([expense, nextDay]);

    expect(days.size).toBe(2);
    expect(days.get('2026-08-13')).toMatchObject({
      hasExpenses: true,
      hasIncomes: false,
    });
  });
});
