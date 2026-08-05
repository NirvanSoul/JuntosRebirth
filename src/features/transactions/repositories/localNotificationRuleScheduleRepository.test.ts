import type { SQLiteDatabase } from 'expo-sqlite';

import {
  countAllScheduledNotifications,
  listSchedulesForRule,
  replaceSchedulesForRule,
} from '@/features/transactions/repositories/localNotificationRuleScheduleRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

describe('localNotificationRuleScheduleRepository', () => {
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const getAllAsync = jest.fn();
  const withExclusiveTransactionAsync = jest.fn(
    async (task: (transaction: SQLiteDatabase) => Promise<void>) =>
      task(database),
  );
  const database = {
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync,
  } as unknown as SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('lista los schedules de una regla', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'schedule-1',
        rule_id: 'rule-1',
        space_id: 'personal',
        occurrence_key: 'tx-1',
        occurred_on: '2026-08-05',
        remind_on: '2026-08-04',
        notification_ids: JSON.stringify(['notif-1']),
        created_at: '2026-08-04T00:00:00.000Z',
      },
    ]);

    const schedules = await listSchedulesForRule('rule-1');

    expect(getAllAsync).toHaveBeenCalledWith(
      'SELECT * FROM transaction_notification_rule_schedules WHERE rule_id = ?',
      'rule-1',
    );
    expect(schedules).toEqual([
      expect.objectContaining({
        id: 'schedule-1',
        ruleId: 'rule-1',
        occurrenceKey: 'tx-1',
        notificationIds: ['notif-1'],
      }),
    ]);
  });

  it('sustituye por completo los schedules de una regla dentro de una transacción', async () => {
    await replaceSchedulesForRule('rule-1', 'personal', [
      {
        occurrenceKey: 'tx-1',
        occurredOn: '2026-08-05',
        remindOn: '2026-08-04',
        notificationIds: ['notif-1'],
      },
    ]);

    expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM transaction_notification_rule_schedules WHERE rule_id = ?',
      'rule-1',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        'INSERT INTO transaction_notification_rule_schedules',
      ),
      '00000000-0000-4000-8000-000000000001',
      'rule-1',
      'personal',
      'tx-1',
      '2026-08-05',
      '2026-08-04',
      JSON.stringify(['notif-1']),
      expect.any(String),
    );
  });

  it('cuenta las notificaciones pendientes entre recordatorios manuales y reglas', async () => {
    getAllAsync.mockResolvedValueOnce([
      { notification_ids: JSON.stringify(['a', 'b']) },
      { notification_ids: JSON.stringify(['c']) },
    ]);

    await expect(countAllScheduledNotifications()).resolves.toBe(3);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('UNION ALL'),
    );
  });
});
