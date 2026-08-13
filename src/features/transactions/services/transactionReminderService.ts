import { getShowAmountsInNotifications } from '@/features/transactions/repositories/notificationPrivacyPreferenceRepository';
import {
  deleteLocalTransactionReminder,
  getLocalTransactionReminder,
  saveLocalTransactionReminder,
} from '@/features/transactions/repositories/localTransactionReminderRepository';
import { buildNotificationContent } from '@/features/transactions/services/notificationTemplateService';
import type {
  SessionTransaction,
  TransactionReminder,
} from '@/features/transactions/types';
import { isValidLocalDate } from '@/features/transactions/utils/transactionRecurrence';
import {
  buildReminderDateTime,
  buildReminderTemplateVariables,
  isValidReminderTime,
  maxTransactionReminderTimesPerDay,
  normalizeReminderTimes,
} from '@/features/transactions/utils/transactionReminders';
import {
  cancelLocalNotification,
  requestNotificationPermission,
  scheduleLocalNotification,
} from '@/lib/notifications/localNotifications';

export async function getTransactionReminder(
  transactionId: string,
): Promise<TransactionReminder | null> {
  return getLocalTransactionReminder(transactionId);
}

export type ScheduleTransactionReminderInput = {
  remindOn: string;
  spaceId: string;
  times: readonly string[];
  transaction: Pick<
    SessionTransaction,
    'amountMinor' | 'currency' | 'id' | 'title' | 'type'
  > & { categoryName?: string };
};

/**
 * Programa (o reemplaza) el recordatorio de un movimiento: cancela las
 * notificaciones previas del movimiento y programa una por cada hora futura
 * indicada para el día elegido.
 */
export async function scheduleTransactionReminder(
  input: ScheduleTransactionReminderInput,
): Promise<TransactionReminder> {
  const times = normalizeReminderTimes(input.times);
  if (
    !isValidLocalDate(input.remindOn) ||
    times.length === 0 ||
    times.length > maxTransactionReminderTimesPerDay ||
    !times.every(isValidReminderTime)
  ) {
    throw new Error('El recordatorio no es válido');
  }

  const now = Date.now();
  const scheduledEntries = times
    .map((time) => ({
      date: buildReminderDateTime(input.remindOn, time),
      time,
    }))
    .filter(
      (entry): entry is { date: Date; time: string } =>
        entry.date !== null && entry.date.getTime() > now,
    );
  if (scheduledEntries.length === 0) {
    throw new Error('Elige una fecha y hora futuras para el recordatorio');
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Activa las notificaciones para programar recordatorios');
  }

  const existing = await getLocalTransactionReminder(input.transaction.id);
  if (existing) {
    await Promise.all(existing.notificationIds.map(cancelLocalNotification));
  }

  const showAmounts = await getShowAmountsInNotifications();
  const { title, body } = await buildNotificationContent({
    scheduledOn: input.remindOn,
    type: input.transaction.type,
    variables: buildReminderTemplateVariables(input.transaction, showAmounts),
  });

  const notificationIds = await Promise.all(
    scheduledEntries.map(({ date }) =>
      scheduleLocalNotification({
        body,
        data: { transactionId: input.transaction.id },
        date,
        title,
      }),
    ),
  );

  return saveLocalTransactionReminder({
    notificationIds,
    remindOn: input.remindOn,
    spaceId: input.spaceId,
    times: scheduledEntries.map((entry) => entry.time),
    transactionId: input.transaction.id,
  });
}

export async function cancelTransactionReminder(
  transactionId: string,
): Promise<void> {
  const existing = await getLocalTransactionReminder(transactionId);
  if (!existing) return;

  await Promise.all(existing.notificationIds.map(cancelLocalNotification));
  await deleteLocalTransactionReminder(transactionId);
}
