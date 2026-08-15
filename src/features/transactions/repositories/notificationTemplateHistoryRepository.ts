import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NotificationTemplateType } from '@/features/transactions/constants/notificationTemplates';
import { addDays } from '@/features/transactions/utils/transactionRecurrence';
import { getLocalTodayKey } from '@/lib/date/localDate';

const historyStorageKey = '@juntoss/notification-template-history/v1';

/** Días hacia atrás que se conservan; suficiente para la ventana de 7 días de rotación. */
const historyRetentionDays = 8;

export type NotificationTemplateUsage = {
  type: NotificationTemplateType;
  templateId: string;
  usedOn: string;
};

type StoredHistory = {
  version: 1;
  entries: NotificationTemplateUsage[];
};

function isNotificationTemplateType(
  value: unknown,
): value is NotificationTemplateType {
  return value === 'expense' || value === 'income' || value === 'daily';
}

function isValidEntry(value: unknown): value is NotificationTemplateUsage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<NotificationTemplateUsage>;
  return (
    isNotificationTemplateType(candidate.type) &&
    typeof candidate.templateId === 'string' &&
    typeof candidate.usedOn === 'string'
  );
}

async function loadHistory(): Promise<NotificationTemplateUsage[]> {
  const stored = await AsyncStorage.getItem(historyStorageKey);
  if (stored === null) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return [];

    const candidate = parsed as Partial<StoredHistory>;
    if (candidate.version !== 1 || !Array.isArray(candidate.entries)) {
      return [];
    }
    return candidate.entries.filter(isValidEntry);
  } catch {
    return [];
  }
}

async function saveHistory(
  entries: readonly NotificationTemplateUsage[],
): Promise<void> {
  const stored: StoredHistory = { version: 1, entries: [...entries] };
  await AsyncStorage.setItem(historyStorageKey, JSON.stringify(stored));
}

/** Uso registrado del tipo indicado, dentro de la ventana de retención local. */
export async function listRecentTemplateUsage(
  type: NotificationTemplateType,
): Promise<readonly NotificationTemplateUsage[]> {
  const entries = await loadHistory();
  return entries.filter((entry) => entry.type === type);
}

/**
 * Registra el uso de una plantilla y poda el historial a
 * `historyRetentionDays` días para que no crezca indefinidamente.
 */
export async function recordTemplateUsage(
  usage: NotificationTemplateUsage,
): Promise<void> {
  const entries = await loadHistory();
  const cutoff = addDays(getLocalTodayKey(), -historyRetentionDays);
  const pruned = entries.filter((entry) => entry.usedOn >= cutoff);

  await saveHistory([...pruned, usage]);
}
