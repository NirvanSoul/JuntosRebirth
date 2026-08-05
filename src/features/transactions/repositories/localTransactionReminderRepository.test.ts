import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteLocalTransactionReminder,
  getLocalTransactionReminder,
  listLocalTransactionReminders,
  saveLocalTransactionReminder,
} from '@/features/transactions/repositories/localTransactionReminderRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

describe('localTransactionReminderRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getFirstAsync = jest.fn();
  const getAllAsync = jest.fn();
  const database = {
    getAllAsync,
    getFirstAsync,
    runAsync,
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('devuelve null cuando el movimiento no tiene recordatorio', async () => {
    getFirstAsync.mockResolvedValueOnce(null);

    await expect(
      getLocalTransactionReminder('transaction-1'),
    ).resolves.toBeNull();
    expect(getFirstAsync).toHaveBeenCalledWith(
      'SELECT * FROM transaction_reminders WHERE transaction_id = ?',
      'transaction-1',
    );
  });

  it('mapea horas y notificaciones almacenadas como JSON', async () => {
    getFirstAsync.mockResolvedValueOnce({
      id: 'reminder-1',
      transaction_id: 'transaction-1',
      space_id: 'personal',
      remind_on: '2026-08-10',
      times: JSON.stringify(['09:00', '20:00']),
      notification_ids: JSON.stringify(['notif-1', 'notif-2']),
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:00.000Z',
    });

    await expect(getLocalTransactionReminder('transaction-1')).resolves.toEqual(
      {
        id: 'reminder-1',
        transactionId: 'transaction-1',
        spaceId: 'personal',
        remindOn: '2026-08-10',
        times: ['09:00', '20:00'],
        notificationIds: ['notif-1', 'notif-2'],
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z',
      },
    );
  });

  it('inserta un recordatorio nuevo con un UUID propio', async () => {
    getFirstAsync.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000001',
      transaction_id: 'transaction-1',
      space_id: 'personal',
      remind_on: '2026-08-10',
      times: JSON.stringify(['09:00']),
      notification_ids: JSON.stringify(['notif-1']),
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    const saved = await saveLocalTransactionReminder({
      transactionId: 'transaction-1',
      spaceId: 'personal',
      remindOn: '2026-08-10',
      times: ['09:00'],
      notificationIds: ['notif-1'],
    });

    expect(saved.transactionId).toBe('transaction-1');
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(transaction_id) DO UPDATE'),
      '00000000-0000-4000-8000-000000000001',
      'transaction-1',
      'personal',
      '2026-08-10',
      JSON.stringify(['09:00']),
      JSON.stringify(['notif-1']),
      expect.any(String),
      expect.any(String),
    );
  });

  it('elimina el recordatorio de un movimiento', async () => {
    await deleteLocalTransactionReminder('transaction-1');

    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM transaction_reminders WHERE transaction_id = ?',
      'transaction-1',
    );
  });

  it('lista todos los recordatorios guardados', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'reminder-1',
        transaction_id: 'transaction-1',
        space_id: 'personal',
        remind_on: '2026-08-10',
        times: JSON.stringify(['09:00']),
        notification_ids: JSON.stringify(['notif-1']),
        created_at: '2026-08-04T00:00:00.000Z',
        updated_at: '2026-08-04T00:00:00.000Z',
      },
    ]);

    const reminders = await listLocalTransactionReminders();

    expect(getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM transaction_reminders',
    );
    expect(reminders).toEqual([
      expect.objectContaining({
        id: 'reminder-1',
        transactionId: 'transaction-1',
        notificationIds: ['notif-1'],
      }),
    ]);
  });
});
