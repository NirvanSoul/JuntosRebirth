import { act, renderHook } from '@testing-library/react-native';

import type { SessionTransaction } from '@/features/transactions/types';
import { useTransactionDetailModal } from '@/navigation/useTransactionDetailModal';

const transaction: SessionTransaction = {
  amountMinor: 500,
  categoryId: 'category-1',
  createdBy: 'user-1',
  currency: 'EUR',
  id: 'transaction-1',
  occurredOn: '2026-10-03',
  recurrence: 'once',
  spaceId: 'personal',
  title: 'Compra',
  type: 'expense',
  updatedAt: '2026-10-03T12:00:00.000Z',
};

describe('useTransactionDetailModal', () => {
  it('conserva el movimiento hasta que la hoja confirma su cierre', async () => {
    const nextAction = jest.fn();
    const { rerender, result } = await renderHook(
      ({ transactions }: { transactions: readonly SessionTransaction[] }) =>
        useTransactionDetailModal({
          assignableMoneyAccounts: [],
          categories: [],
          moneyAccounts: [],
          transactions,
        }),
      { initialProps: { transactions: [transaction] } },
    );

    await act(async () => result.current.open(transaction.id));
    expect(result.current.visible).toBe(true);
    expect(result.current.transaction).toEqual(transaction);

    await act(async () => result.current.closeThenRun(nextAction));
    await rerender({ transactions: [] });

    expect(result.current.visible).toBe(false);
    expect(result.current.transaction).toEqual(transaction);
    expect(nextAction).not.toHaveBeenCalled();

    await act(async () => result.current.handleDismissed());

    expect(result.current.transaction).toBeNull();
    expect(nextAction).toHaveBeenCalledTimes(1);
  });
});
