import { randomUUID } from 'expo-crypto';

import { getLocalDatabase } from '@/lib/storage/localDatabase';

type ScheduleRow = {
  id: string;
  rule_id: string;
  space_id: string;
  occurrence_key: string;
  occurred_on: string;
  remind_on: string;
  notification_ids: string;
  created_at: string;
};

export type LocalNotificationRuleSchedule = {
  id: string;
  ruleId: string;
  spaceId: string;
  occurrenceKey: string;
  occurredOn: string;
  remindOn: string;
  notificationIds: readonly string[];
  createdAt: string;
};

function mapSchedule(row: ScheduleRow): LocalNotificationRuleSchedule {
  return {
    id: row.id,
    ruleId: row.rule_id,
    spaceId: row.space_id,
    occurrenceKey: row.occurrence_key,
    occurredOn: row.occurred_on,
    remindOn: row.remind_on,
    notificationIds: JSON.parse(row.notification_ids) as string[],
    createdAt: row.created_at,
  };
}

export async function listSchedulesForRule(
  ruleId: string,
): Promise<LocalNotificationRuleSchedule[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<ScheduleRow>(
    'SELECT * FROM transaction_notification_rule_schedules WHERE rule_id = ?',
    ruleId,
  );
  return rows.map(mapSchedule);
}

export type ReplaceScheduleEntry = {
  occurrenceKey: string;
  occurredOn: string;
  remindOn: string;
  notificationIds: readonly string[];
};

/**
 * Sustituye por completo el conjunto de notificaciones programadas de una
 * regla (la tabla es una caché regenerable: se reconstruye en cada
 * reconciliación, no se edita fila a fila).
 */
export async function replaceSchedulesForRule(
  ruleId: string,
  spaceId: string,
  entries: readonly ReplaceScheduleEntry[],
): Promise<void> {
  const database = await getLocalDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'DELETE FROM transaction_notification_rule_schedules WHERE rule_id = ?',
      ruleId,
    );

    for (const entry of entries) {
      await transaction.runAsync(
        `INSERT INTO transaction_notification_rule_schedules (
           id, rule_id, space_id, occurrence_key, occurred_on, remind_on,
           notification_ids, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        ruleId,
        spaceId,
        entry.occurrenceKey,
        entry.occurredOn,
        entry.remindOn,
        JSON.stringify(entry.notificationIds),
        now,
      );
    }
  });
}

/**
 * Notificaciones locales actualmente pendientes entre recordatorios manuales
 * y reglas, para respetar el mismo presupuesto compartido frente al límite
 * del sistema operativo.
 */
export async function countAllScheduledNotifications(): Promise<number> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{ notification_ids: string }>(
    `SELECT notification_ids FROM transaction_reminders
     UNION ALL
     SELECT notification_ids FROM transaction_notification_rule_schedules`,
  );

  return rows.reduce((total, row) => {
    const ids = JSON.parse(row.notification_ids) as unknown[];
    return total + ids.length;
  }, 0);
}
