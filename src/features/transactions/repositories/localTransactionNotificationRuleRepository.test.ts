import type { SQLiteDatabase } from 'expo-sqlite';

import {
  listLocalNotificationRules,
  saveLocalNotificationRule,
} from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

describe('localTransactionNotificationRuleRepository', () => {
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

  it('lista todas las reglas cuando no se filtra por espacio', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'rule-1',
        space_id: 'personal',
        transaction_type: 'expense',
        is_enabled: 1,
        days_before: 1,
        times: JSON.stringify(['09:00', '18:00']),
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
      },
    ]);

    const rules = await listLocalNotificationRules();

    expect(getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM transaction_notification_rules',
    );
    expect(rules).toEqual([
      {
        id: 'rule-1',
        spaceId: 'personal',
        transactionType: 'expense',
        isEnabled: true,
        daysBefore: 1,
        times: ['09:00', '18:00'],
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
  });

  it('filtra por espacio cuando se indica', async () => {
    getAllAsync.mockResolvedValueOnce([]);

    await listLocalNotificationRules('couple');

    expect(getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM transaction_notification_rules WHERE space_id = ?',
      'couple',
    );
  });

  it('inserta o reemplaza la regla de un espacio y tipo', async () => {
    getFirstAsync.mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000001',
      space_id: 'personal',
      transaction_type: 'expense',
      is_enabled: 0,
      days_before: 2,
      times: JSON.stringify(['08:00']),
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    const saved = await saveLocalNotificationRule({
      spaceId: 'personal',
      transactionType: 'expense',
      isEnabled: false,
      daysBefore: 2,
      times: ['08:00'],
    });

    expect(saved.isEnabled).toBe(false);
    expect(saved.daysBefore).toBe(2);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining(
        'ON CONFLICT(space_id, transaction_type) DO UPDATE',
      ),
      '00000000-0000-4000-8000-000000000001',
      'personal',
      'expense',
      0,
      2,
      JSON.stringify(['08:00']),
      expect.any(String),
      expect.any(String),
    );
  });
});
