import {
  listNotificationTemplatesByType,
  type NotificationTemplate,
} from '@/features/transactions/constants/notificationTemplates';
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
  listScheduledLocalNotifications,
  requestNotificationPermission,
  scheduleLocalNotification,
} from '@/lib/notifications/localNotifications';

/**
 * Hora local a la que se entrega el recordatorio diario. No es configurable:
 * el aviso siempre está activo, sin ajuste del usuario.
 */
export const dailyReminderTime = '20:00';

const dailyReminderNotificationType = 'daily-engagement';
const dailyReminderTitles = new Set(
  listNotificationTemplatesByType('daily').map(
    (template: NotificationTemplate) => template.title,
  ),
);

/**
 * La reconciliación se invoca desde varios ciclos de vida de la app (carga,
 * primer plano y cambios de movimientos). Serializarla evita que dos llamadas
 * lean a la vez que no hay un aviso guardado y programen duplicados.
 */
let dailyReminderReconciliationQueue: Promise<void> = Promise.resolve();

function isDailyReminderNotification(notification: {
  data: Record<string, unknown>;
  title: string | null;
}): boolean {
  return (
    notification.data.notificationType === dailyReminderNotificationType ||
    (notification.title !== null && dailyReminderTitles.has(notification.title))
  );
}

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
async function reconcileDailyReminderNow({
  transactions,
}: ReconcileDailyReminderInput): Promise<void> {
  const today = getLocalToday();
  const todayAt = buildReminderDateTime(today, dailyReminderTime);
  const canStillNotifyToday =
    todayAt !== null &&
    todayAt.getTime() > Date.now() &&
    !hasLoggedTransactionToday(transactions, today);

  const scheduledOn = canStillNotifyToday ? today : addDays(today, 1);
  const previous = await getDailyReminderSchedule();
  const scheduledDailyIds = (await listScheduledLocalNotifications())
    .filter(isDailyReminderNotification)
    .map((notification) => notification.id);
  const hasDuplicateScheduledDailyReminder = scheduledDailyIds.length > 1;

  // La hora fija y el contenido solo dependen de la fecha programada. Si ya
  // existe el único aviso esperado, no lo cancelamos ni elegimos otra plantilla.
  if (
    previous?.scheduledOn === scheduledOn &&
    !hasDuplicateScheduledDailyReminder
  ) {
    return;
  }

  const notificationIdsToCancel = new Set([
    ...scheduledDailyIds,
    ...(previous ? [previous.notificationId] : []),
  ]);
  if (notificationIdsToCancel.size > 0) {
    await Promise.all(
      [...notificationIdsToCancel].map((notificationId) =>
        cancelLocalNotification(notificationId),
      ),
    );
  }
  if (previous) {
    await clearDailyReminderSchedule();
  }

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
    data: { notificationType: dailyReminderNotificationType },
    date: scheduledDate,
    title,
  });

  await saveDailyReminderSchedule({ notificationId, scheduledOn });
}

export function reconcileDailyReminder(
  input: ReconcileDailyReminderInput,
): Promise<void> {
  const reconciliation = dailyReminderReconciliationQueue.then(() =>
    reconcileDailyReminderNow(input),
  );

  // Un fallo no debe bloquear futuras reconciliaciones del ciclo de vida.
  dailyReminderReconciliationQueue = reconciliation.catch(() => undefined);

  return reconciliation;
}
