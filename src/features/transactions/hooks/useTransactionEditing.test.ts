import { act, renderHook } from '@testing-library/react-native';

import { useTransactionEditing } from '@/features/transactions/hooks/useTransactionEditing';
import { updateLocalTransaction } from '@/features/transactions/repositories/localTransactionRepository';
import { updateLocalTransactionOccurredTime } from '@/features/transactions/repositories/localTransactionTimeRepository';
import type { SessionTransaction } from '@/features/transactions/types';

jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    listLocalTransactions: jest.fn(),
    updateLocalTransaction: jest.fn(),
  }),
);
jest.mock(
  '@/features/transactions/repositories/localTransactionTimeRepository',
  () => ({ updateLocalTransactionOccurredTime: jest.fn() }),
);
jest.mock('@/features/transactions/services/notificationRuleService', () => ({
  reconcileNotificationRules: jest.fn(async () => undefined),
}));

const transaction: SessionTransaction = {
  id: 'tx-1',
  createdBy: 'user-1',
  spaceId: 'personal',
  categoryId: 'food',
  type: 'expense',
  amountMinor: 1_250,
  currency: 'EUR',
  title: 'Compra',
  occurredOn: '2026-11-04',
  occurredTime: '09:00',
  recurrence: 'once',
  updatedAt: '2026-11-04T10:00:00.000Z',
};

async function setup() {
  const callbacks = {
    onChangesPublished: jest.fn(),
    onError: jest.fn(),
    setDetailTransactionId: jest.fn(),
    setTransactions: jest.fn(),
  };
  const { result } = await renderHook(() =>
    useTransactionEditing({
      categories: [],
      spaceTransactions: [transaction],
      ...callbacks,
    }),
  );
  return { callbacks, result };
}

describe('useTransactionEditing › hora', () => {
  beforeEach(() => jest.clearAllMocks());

  it('guarda solo la hora, sin pasar por el borrador completo, y publica', async () => {
    jest
      .mocked(updateLocalTransactionOccurredTime)
      .mockResolvedValueOnce('2026-11-04T15:00:00.000Z');
    const { callbacks, result } = await setup();

    await act(() =>
      result.current.quickEditTransaction('tx-1', {
        field: 'time',
        occurredTime: '14:35',
      }),
    );

    expect(updateLocalTransactionOccurredTime).toHaveBeenCalledWith(
      'tx-1',
      'personal',
      '14:35',
    );
    expect(updateLocalTransaction).not.toHaveBeenCalled();
    const update = callbacks.setTransactions.mock.calls[0]![0];
    expect(update([transaction])).toEqual([
      {
        ...transaction,
        occurredTime: '14:35',
        updatedAt: '2026-11-04T15:00:00.000Z',
      },
    ]);
    expect(callbacks.onChangesPublished).toHaveBeenCalledTimes(1);
  });

  it('quitar la hora la elimina del movimiento de la sesión', async () => {
    jest
      .mocked(updateLocalTransactionOccurredTime)
      .mockResolvedValueOnce('2026-11-04T15:00:00.000Z');
    const { callbacks, result } = await setup();

    await act(() =>
      result.current.quickEditTransaction('tx-1', {
        field: 'time',
        occurredTime: null,
      }),
    );

    const [updated] = callbacks.setTransactions.mock.calls[0]![0]([
      transaction,
    ]);
    expect(updated).not.toHaveProperty('occurredTime');
  });

  it('avisa del error y no publica si el guardado falla', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .mocked(updateLocalTransactionOccurredTime)
      .mockRejectedValueOnce(new Error('sin fila'));
    const { callbacks, result } = await setup();

    await act(() =>
      result.current.quickEditTransaction('tx-1', {
        field: 'time',
        occurredTime: '14:35',
      }),
    );

    expect(callbacks.onError).toHaveBeenCalled();
    expect(callbacks.onChangesPublished).not.toHaveBeenCalled();
  });
});
