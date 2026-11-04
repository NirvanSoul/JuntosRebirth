import type { SQLiteDatabase } from 'expo-sqlite';

import {
  updateLocalTransactionOccurredTime,
  withStoredOccurredTimes,
} from '@/features/transactions/repositories/localTransactionTimeRepository';
import type { SessionTransaction } from '@/features/transactions/types';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
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
  recurrence: 'once',
  updatedAt: '2026-11-04T10:00:00.000Z',
};

describe('localTransactionTimeRepository', () => {
  const runAsync = jest.fn(async (..._args: unknown[]) => ({
    changes: 1,
    lastInsertRowId: 0,
  }));
  const getAllAsync = jest.fn(
    async (..._args: unknown[]): Promise<unknown[]> => [],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-11-04T15:00:00.000Z'));
    mockGetLocalDatabase.mockResolvedValue({
      getAllAsync,
      runAsync,
    } as unknown as SQLiteDatabase);
  });

  afterEach(() => jest.useRealTimers());

  it('guarda la hora, marca el movimiento pendiente y devuelve su updatedAt', async () => {
    const updatedAt = await updateLocalTransactionOccurredTime(
      'tx-1',
      'personal',
      '14:35',
    );

    expect(updatedAt).toBe('2026-11-04T15:00:00.000Z');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringMatching(
        /SET occurred_time = \?, updated_at = \?[\s\S]*'pending'/,
      ),
      '14:35',
      '2026-11-04T15:00:00.000Z',
      'tx-1',
      'personal',
    );
  });

  it('quita la hora con null', async () => {
    await updateLocalTransactionOccurredTime('tx-1', 'personal', null);

    expect(runAsync).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.any(String),
      'tx-1',
      'personal',
    );
  });

  it('rechaza una hora mal formada sin escribir', async () => {
    await expect(
      updateLocalTransactionOccurredTime('tx-1', 'personal', '25:00'),
    ).rejects.toThrow('La hora del movimiento no es válida');
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('devuelve los movimientos editados con la hora que conserva SQLite', async () => {
    getAllAsync.mockResolvedValueOnce([
      { id: 'tx-1', occurred_time: '08:10' },
      { id: 'tx-2', occurred_time: null },
    ]);

    const [kept, cleared] = await withStoredOccurredTimes([
      transaction,
      { ...transaction, id: 'tx-2', occurredTime: '23:00' },
    ]);

    expect(kept!.occurredTime).toBe('08:10');
    expect(cleared).not.toHaveProperty('occurredTime');
  });
});
