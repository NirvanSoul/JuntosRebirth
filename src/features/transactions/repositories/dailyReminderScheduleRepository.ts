import AsyncStorage from '@react-native-async-storage/async-storage';

const dailyReminderScheduleStorageKey = '@juntoss/daily-reminder-schedule/v1';

/** Estado del único recordatorio diario programado en cada momento. */
export type DailyReminderSchedule = {
  notificationId: string;
  scheduledOn: string;
};

type StoredDailyReminderSchedule = {
  version: 1;
} & DailyReminderSchedule;

function isValidSchedule(
  value: Partial<StoredDailyReminderSchedule>,
): value is StoredDailyReminderSchedule {
  return (
    value.version === 1 &&
    typeof value.notificationId === 'string' &&
    typeof value.scheduledOn === 'string'
  );
}

export async function getDailyReminderSchedule(): Promise<DailyReminderSchedule | null> {
  const stored = await AsyncStorage.getItem(dailyReminderScheduleStorageKey);
  if (stored === null) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Partial<StoredDailyReminderSchedule>;
    if (!isValidSchedule(candidate)) return null;

    return {
      notificationId: candidate.notificationId,
      scheduledOn: candidate.scheduledOn,
    };
  } catch {
    return null;
  }
}

export async function saveDailyReminderSchedule(
  schedule: DailyReminderSchedule,
): Promise<void> {
  const stored: StoredDailyReminderSchedule = { version: 1, ...schedule };
  await AsyncStorage.setItem(
    dailyReminderScheduleStorageKey,
    JSON.stringify(stored),
  );
}

export async function clearDailyReminderSchedule(): Promise<void> {
  await AsyncStorage.removeItem(dailyReminderScheduleStorageKey);
}
