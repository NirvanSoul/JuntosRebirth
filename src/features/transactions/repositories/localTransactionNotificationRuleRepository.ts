import { randomUUID } from 'expo-crypto';

import type {
  TransactionNotificationRule,
  TransactionType,
} from '@/features/transactions/types';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

type NotificationRuleRow = {
  id: string;
  space_id: string;
  transaction_type: TransactionType;
  is_enabled: number;
  days_before: number;
  times: string;
  created_at: string;
  updated_at: string;
};

function mapNotificationRule(
  row: NotificationRuleRow,
): TransactionNotificationRule {
  return {
    id: row.id,
    spaceId: row.space_id,
    transactionType: row.transaction_type,
    isEnabled: row.is_enabled === 1,
    daysBefore: row.days_before,
    times: JSON.parse(row.times) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLocalNotificationRules(
  spaceId?: string,
): Promise<TransactionNotificationRule[]> {
  const database = await getLocalDatabase();
  const rows = spaceId
    ? await database.getAllAsync<NotificationRuleRow>(
        'SELECT * FROM transaction_notification_rules WHERE space_id = ?',
        spaceId,
      )
    : await database.getAllAsync<NotificationRuleRow>(
        'SELECT * FROM transaction_notification_rules',
      );

  return rows.map(mapNotificationRule);
}

export type SaveLocalNotificationRuleInput = {
  spaceId: string;
  transactionType: TransactionType;
  isEnabled: boolean;
  daysBefore: number;
  times: readonly string[];
};

/** Crea o reemplaza la regla de un tipo de movimiento (una fila por espacio y tipo). */
export async function saveLocalNotificationRule(
  input: SaveLocalNotificationRuleInput,
): Promise<TransactionNotificationRule> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO transaction_notification_rules (
       id, space_id, transaction_type, is_enabled, days_before, times,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(space_id, transaction_type) DO UPDATE SET
       is_enabled = excluded.is_enabled,
       days_before = excluded.days_before,
       times = excluded.times,
       updated_at = excluded.updated_at`,
    randomUUID(),
    input.spaceId,
    input.transactionType,
    input.isEnabled ? 1 : 0,
    input.daysBefore,
    JSON.stringify(input.times),
    now,
    now,
  );

  const saved = await database.getFirstAsync<NotificationRuleRow>(
    'SELECT * FROM transaction_notification_rules WHERE space_id = ? AND transaction_type = ?',
    input.spaceId,
    input.transactionType,
  );
  if (!saved) {
    throw new Error('No pudimos guardar la regla de notificación');
  }
  return mapNotificationRule(saved);
}
