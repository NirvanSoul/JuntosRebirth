import {
  clearDailyReminderSchedule,
  getDailyReminderSchedule,
  saveDailyReminderSchedule,
} from '@/features/transactions/repositories/dailyReminderScheduleRepository';
import { buildNotificationContent } from '@/features/transactions/services/notificationTemplateService';
import type { SessionTransaction } from '@/features/transactions/types';
import {
  addDays,
  getLocalToday,
} from '@/features/transactions/utils/transactionRecurrence';
import { buildReminderDateTime } from '@/features/transactions/utils/transactionReminders';
import {
  cancelLocalNotification,
  requestNotificationPermission,
  scheduleLocalNotification,
} from '@/lib/notifications/localNotifications';

/**
 * Hora local a la que se entrega el recordatorio diario. No es configurable:
 * el aviso siempre está activo, sin ajuste del usuario.
 */
export const dailyReminderTime = '20:00';

/** Un movimiento con `updatedAt` de hoy cuenta como "ya registró algo hoy". */
export function hasLoggedTransactionToday(
  transactions: readonly SessionTransaction[],
  today: string,
): boolean {
  return transactions.some((transaction) =>
    transaction.updatedAt.startsWith(today),
  );
}

export type ReconcileDailyReminderInput = {
  transactions: readonly SessionTransaction[];
};

/**
 * Reconcilia el único recordatorio diario que puede haber pendiente: cancela
 * el anterior y programa el próximo (hoy si `dailyReminderTime` no pasó
 * todavía y el usuario no registró nada hoy; si no, mañana), para respetar
 * el máximo de un aviso al día. Siempre activo, sin ajuste de usuario.
 */
export async function reconcileDailyReminder({
  transactions,
}: ReconcileDailyReminderInput): Promise<void> {
  const previous = await getDailyReminderSchedule();
  if (previous) {
    await cancelLocalNotification(previous.notificationId);
    await clearDailyReminderSchedule();
  }

  const today = getLocalToday();
  const todayAt = buildReminderDateTime(today, dailyReminderTime);
  const canStillNotifyToday =
    todayAt !== null &&
    todayAt.getTime() > Date.now() &&
    !hasLoggedTransactionToday(transactions, today);

  const scheduledOn = canStillNotifyToday ? today : addDays(today, 1);
  const scheduledDate = buildReminderDateTime(scheduledOn, dailyReminderTime);
  if (!scheduledDate) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const { title, body } = await buildNotificationContent({
    scheduledOn,
    type: 'daily',
    variables: {},
  });

  const notificationId = await scheduleLocalNotification({
    body,
    channel: 'dailyEngagement',
    date: scheduledDate,
    title,
  });

  await saveDailyReminderSchedule({ notificationId, scheduledOn });
}
