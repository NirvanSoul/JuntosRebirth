import type { NotificationTemplateVariable } from '@/features/transactions/constants/notificationTemplates';
import type { TransactionType } from '@/features/transactions/types';
import { isValidLocalDate } from '@/features/transactions/utils/transactionRecurrence';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { formatCurrency } from '@/lib/currency/formatCurrency';

/** Tope de recordatorios que se pueden programar para un mismo día. */
export const maxTransactionReminderTimesPerDay = 6;

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidReminderTime(time: string): boolean {
  return timePattern.test(time);
}

/** Ordena y elimina horas repetidas, sin alterar su formato `HH:mm`. */
export function normalizeReminderTimes(
  times: readonly string[],
): readonly string[] {
  return [...new Set(times)].sort();
}

/** Combina una fecha local `YYYY-MM-DD` y una hora `HH:mm` en un `Date` en hora local. */
export function buildReminderDateTime(
  remindOn: string,
  time: string,
): Date | null {
  if (!isValidLocalDate(remindOn) || !isValidReminderTime(time)) return null;

  const [year, month, day] = remindOn.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
}

/** Formatea la hora de un `Date` como `HH:mm` en hora local. */
export function formatTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

/** Convierte una hora `HH:mm` en un `Date` de hoy, para inicializar un selector nativo. */
export function timeOfDayToDate(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour ?? 0, minute ?? 0, 0, 0);
  return date;
}

/**
 * Variables disponibles para interpolar en una plantilla de notificación de
 * recordatorio, a partir de los datos de un movimiento. Función pura: no
 * decide qué plantilla se usa, solo prepara los valores que podría necesitar.
 */
export function buildReminderTemplateVariables(transaction: {
  amountMinor: number;
  currency: CurrencyCode;
  categoryName?: string;
  title: string;
  type: TransactionType;
}): Partial<Record<NotificationTemplateVariable, string>> {
  const amount = formatCurrency(
    transaction.amountMinor,
    transaction.currency,
    'es-ES',
  );
  const title = transaction.title.trim();

  return {
    amount,
    category: transaction.categoryName?.trim() || undefined,
    title: title || undefined,
  };
}
