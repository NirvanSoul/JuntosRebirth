import type { Category } from '@/features/categories/types';
import { listLocalNotificationRules } from '@/features/transactions/repositories/localTransactionNotificationRuleRepository';
import {
  listSchedulesForRule,
  replaceSchedulesForRule,
  type ReplaceScheduleEntry,
} from '@/features/transactions/repositories/localNotificationRuleScheduleRepository';
import { listLocalTransactionReminders } from '@/features/transactions/repositories/localTransactionReminderRepository';
import { buildNotificationContent } from '@/features/transactions/services/notificationTemplateService';
import type {
  SessionTransaction,
  TransactionNotificationRule,
} from '@/features/transactions/types';
import {
  addDays,
  getLocalToday,
  parseProjectedTransactionId,
  projectRecurringTransactions,
} from '@/features/transactions/utils/transactionRecurrence';
import {
  buildReminderDateTime,
  buildReminderTemplateVariables,
  normalizeReminderTimes,
} from '@/features/transactions/utils/transactionReminders';
import {
  cancelLocalNotification,
  requestNotificationPermission,
  scheduleLocalNotification,
} from '@/lib/notifications/localNotifications';

/** Cuántos días hacia adelante se agendan notificaciones de reglas en cada reconciliación. */
export const notificationRuleWindowDays = 14;

/**
 * Margen de seguridad bajo el límite de notificaciones locales pendientes del
 * sistema operativo (iOS admite hasta 64 por app), compartido entre
 * recordatorios manuales y los generados por reglas.
 */
export const maxPendingLocalNotifications = 60;

type CandidateOccurrence = {
  occurredOn: string;
  occurrenceKey: string;
  remindOn: string;
  rule: TransactionNotificationRule;
  transaction: SessionTransaction;
};

async function cancelScheduleNotifications(
  schedules: readonly { notificationIds: readonly string[] }[],
): Promise<void> {
  await Promise.all(
    schedules.flatMap((schedule) =>
      schedule.notificationIds.map(cancelLocalNotification),
    ),
  );
}

export type ReconcileNotificationRulesInput = {
  categories: readonly Category[];
  transactions: readonly SessionTransaction[];
};

/**
 * Recalcula por completo (cancela y reprograma) las notificaciones locales
 * generadas por reglas de todos los espacios, dentro de una ventana móvil de
 * `notificationRuleWindowDays` días. Respeta cualquier recordatorio manual ya
 * fijado sobre un movimiento real y comparte el presupuesto de notificaciones
 * pendientes con `transaction_reminders` para no exceder el límite del
 * sistema operativo.
 */
export async function reconcileNotificationRules({
  categories,
  transactions,
}: ReconcileNotificationRulesInput): Promise<void> {
  const rules = await listLocalNotificationRules();
  if (rules.length === 0) return;

  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name] as const),
  );

  const today = getLocalToday();
  const windowEnd = addDays(today, notificationRuleWindowDays);
  const occurrences = projectRecurringTransactions({
    endOn: windowEnd,
    startOn: today,
    transactions,
  });

  const manualReminders = await listLocalTransactionReminders();
  const manuallyRemindedTransactionIds = new Set(
    manualReminders.map((reminder) => reminder.transactionId),
  );
  const manualNotificationCount = manualReminders.reduce(
    (total, reminder) => total + reminder.notificationIds.length,
    0,
  );

  const rulesBySpaceAndType = new Map(
    rules
      .filter((rule) => rule.isEnabled)
      .map(
        (rule) => [`${rule.spaceId}:${rule.transactionType}`, rule] as const,
      ),
  );

  const candidates: CandidateOccurrence[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.occurredOn < today || occurrence.occurredOn > windowEnd) {
      continue;
    }
    const rule = rulesBySpaceAndType.get(
      `${occurrence.spaceId}:${occurrence.type}`,
    );
    if (!rule) continue;

    const isProjected = parseProjectedTransactionId(occurrence.id) !== null;
    if (!isProjected && manuallyRemindedTransactionIds.has(occurrence.id)) {
      continue;
    }

    const remindOn = addDays(occurrence.occurredOn, -rule.daysBefore);
    if (remindOn < today) continue;

    candidates.push({
      occurredOn: occurrence.occurredOn,
      occurrenceKey: occurrence.id,
      remindOn,
      rule,
      transaction: occurrence,
    });
  }

  candidates.sort((left, right) =>
    left.remindOn === right.remindOn
      ? left.occurredOn.localeCompare(right.occurredOn)
      : left.remindOn.localeCompare(right.remindOn),
  );

  const entriesByRuleId = new Map<string, ReplaceScheduleEntry[]>(
    rules.map((rule) => [rule.id, []] as const),
  );

  const availableBudget = Math.max(
    0,
    maxPendingLocalNotifications - manualNotificationCount,
  );

  if (candidates.length > 0 && availableBudget > 0) {
    const granted = await requestNotificationPermission();
    if (granted) {
      let usedBudget = 0;
      const now = Date.now();

      for (const candidate of candidates) {
        const times = normalizeReminderTimes(candidate.rule.times);
        const scheduledEntries = times
          .map((time) => ({
            date: buildReminderDateTime(candidate.remindOn, time),
            time,
          }))
          .filter(
            (entry): entry is { date: Date; time: string } =>
              entry.date !== null && entry.date.getTime() > now,
          );
        if (scheduledEntries.length === 0) continue;
        if (usedBudget + scheduledEntries.length > availableBudget) break;

        const { title, body } = await buildNotificationContent({
          scheduledOn: candidate.remindOn,
          type: candidate.transaction.type,
          variables: buildReminderTemplateVariables({
            amountMinor: candidate.transaction.amountMinor,
            categoryName: categoryNameById.get(
              candidate.transaction.categoryId,
            ),
            currency: candidate.transaction.currency,
            title: candidate.transaction.title,
            type: candidate.transaction.type,
          }),
        });
        const notificationIds = await Promise.all(
          scheduledEntries.map(({ date }) =>
            scheduleLocalNotification({
              body,
              data: {
                ruleId: candidate.rule.id,
                transactionId: candidate.transaction.id,
              },
              date,
              title,
            }),
          ),
        );

        usedBudget += notificationIds.length;
        entriesByRuleId.get(candidate.rule.id)!.push({
          notificationIds,
          occurredOn: candidate.occurredOn,
          occurrenceKey: candidate.occurrenceKey,
          remindOn: candidate.remindOn,
        });
      }
    }
  }

  for (const rule of rules) {
    const previousSchedules = await listSchedulesForRule(rule.id);
    await cancelScheduleNotifications(previousSchedules);
    await replaceSchedulesForRule(
      rule.id,
      rule.spaceId,
      entriesByRuleId.get(rule.id) ?? [],
    );
  }
}
