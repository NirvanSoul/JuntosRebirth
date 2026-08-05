import { randomUUID } from 'expo-crypto';

import type { TransactionReminder } from '@/features/transactions/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type ReminderRow = {
  id: string;
  transaction_id: string;
  space_id: string;
  remind_on: string;
  times: string;
  notification_ids: string;
  created_at: string;
  updated_at: string;
};

export type LocalTransactionReminder = TransactionReminder & {
  notificationIds: readonly string[];
};

function mapReminder(row: ReminderRow): LocalTransactionReminder {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    spaceId: row.space_id,
    remindOn: row.remind_on,
    times: JSON.parse(row.times) as string[],
    notificationIds: JSON.parse(row.notification_ids) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLocalTransactionReminders(): Promise<
  LocalTransactionReminder[]
> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<ReminderRow>(
    'SELECT * FROM transaction_reminders',
  );
  return rows.map(mapReminder);
}

export async function getLocalTransactionReminder(
  transactionId: string,
): Promise<LocalTransactionReminder | null> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<ReminderRow>(
    'SELECT * FROM transaction_reminders WHERE transaction_id = ?',
    transactionId,
  );

  return row ? mapReminder(row) : null;
}

export type SaveLocalTransactionReminderInput = {
  transactionId: string;
  spaceId: string;
  remindOn: string;
  times: readonly string[];
  notificationIds: readonly string[];
};

/** Crea o reemplaza la configuración de recordatorio de un movimiento (una fila por movimiento). */
export async function saveLocalTransactionReminder(
  input: SaveLocalTransactionReminderInput,
): Promise<LocalTransactionReminder> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO transaction_reminders (
       id, transaction_id, space_id, remind_on, times, notification_ids,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(transaction_id) DO UPDATE SET
       remind_on = excluded.remind_on,
       times = excluded.times,
       notification_ids = excluded.notification_ids,
       updated_at = excluded.updated_at`,
    randomUUID(),
    input.transactionId,
    input.spaceId,
    input.remindOn,
    JSON.stringify(input.times),
    JSON.stringify(input.notificationIds),
    now,
    now,
  );

  const saved = await getLocalTransactionReminder(input.transactionId);
  if (!saved) {
    throw new Error('No pudimos guardar el recordatorio del movimiento');
  }
  return saved;
}

export async function deleteLocalTransactionReminder(
  transactionId: string,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    'DELETE FROM transaction_reminders WHERE transaction_id = ?',
    transactionId,
  );
}
