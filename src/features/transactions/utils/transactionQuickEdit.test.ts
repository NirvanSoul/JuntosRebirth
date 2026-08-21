import type { SessionTransaction } from '@/features/transactions/types';
import { applyTransactionQuickEdit } from '@/features/transactions/utils/transactionQuickEdit';

const transaction: SessionTransaction = {
  id: 'lunch',
  createdBy: 'installation-id',
  spaceId: 'personal',
  type: 'expense',
  amountMinor: 1250,
  currency: 'EUR',
  title: 'Comida',
  categoryId: 'food',
  moneyAccountId: 'account-1',
  occurredOn: '2026-05-10',
  recurrence: 'monthly',
  updatedAt: '2026-05-10T10:00:00.000Z',
};

describe('applyTransactionQuickEdit', () => {
  it('cambia solo la fecha y conserva el resto del movimiento', () => {
    expect(
      applyTransactionQuickEdit(transaction, {
        field: 'date',
        occurredOn: '2026-06-01',
      }),
    ).toEqual({
      spaceId: 'personal',
      type: 'expense',
      amountMinor: 1250,
      currency: 'EUR',
      title: 'Comida',
      categoryId: 'food',
      moneyAccountId: 'account-1',
      occurredOn: '2026-06-01',
      recurrence: 'monthly',
      customOccurrenceDates: undefined,
    });
  });

  it('retira la cuenta cuando la selección es «Sin cuenta»', () => {
    const draft = applyTransactionQuickEdit(transaction, {
      field: 'money-account',
      moneyAccountId: undefined,
    });

    expect(draft.moneyAccountId).toBeUndefined();
    expect(draft.categoryId).toBe('food');
  });

  it('guarda las fechas de una recurrencia personalizada', () => {
    const draft = applyTransactionQuickEdit(transaction, {
      customOccurrenceDates: ['2026-05-10', '2026-05-20'],
      field: 'recurrence',
      recurrence: 'custom',
    });

    expect(draft.recurrence).toBe('custom');
    expect(draft.customOccurrenceDates).toEqual(['2026-05-10', '2026-05-20']);
  });

  it('descarta las fechas personalizadas al dejar de serlo', () => {
    const draft = applyTransactionQuickEdit(
      {
        ...transaction,
        recurrence: 'custom',
        customOccurrenceDates: ['2026-05-10'],
      },
      { field: 'recurrence', recurrence: 'once' },
    );

    expect(draft.recurrence).toBe('once');
    expect(draft.customOccurrenceDates).toBeUndefined();
  });
});
