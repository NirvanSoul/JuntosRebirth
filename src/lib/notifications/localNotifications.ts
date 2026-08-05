import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const androidReminderChannelId = 'transaction-reminders';
const androidDailyEngagementChannelId = 'daily-engagement';

let isHandlerRegistered = false;
let isAndroidReminderChannelEnsured = false;
let isAndroidDailyEngagementChannelEnsured = false;

/** Controla cómo se presenta una notificación mientras la app está en primer plano. */
export function ensureNotificationHandlerRegistered(): void {
  if (isHandlerRegistered) return;
  isHandlerRegistered = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isAndroidReminderChannelEnsured) return;
  isAndroidReminderChannelEnsured = true;

  await Notifications.setNotificationChannelAsync(androidReminderChannelId, {
    importance: Notifications.AndroidImportance.HIGH,
    name: 'Recordatorios de movimientos',
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function ensureAndroidDailyEngagementChannel(): Promise<void> {
  if (Platform.OS !== 'android' || isAndroidDailyEngagementChannelEnsured) {
    return;
  }
  isAndroidDailyEngagementChannelEnsured = true;

  await Notifications.setNotificationChannelAsync(
    androidDailyEngagementChannelId,
    {
      importance: Notifications.AndroidImportance.DEFAULT,
      name: 'Recordatorio diario',
      vibrationPattern: [0, 250, 250, 250],
    },
  );
}

/** Solicita permiso de notificaciones si aún no fue concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted;
}

type NotificationChannel = 'reminder' | 'dailyEngagement';

type ScheduleLocalNotificationInput = {
  body: string;
  /** Canal Android a usar; separa el silencio del usuario entre tipos de aviso. */
  channel?: NotificationChannel;
  data?: Record<string, string>;
  date: Date;
  title: string;
};

/** Programa una notificación local para una fecha y hora concretas y devuelve su identificador. */
export async function scheduleLocalNotification({
  body,
  channel = 'reminder',
  data,
  date,
  title,
}: ScheduleLocalNotificationInput): Promise<string> {
  const channelId =
    channel === 'dailyEngagement'
      ? androidDailyEngagementChannelId
      : androidReminderChannelId;

  if (channel === 'dailyEngagement') {
    await ensureAndroidDailyEngagementChannel();
  } else {
    await ensureAndroidReminderChannel();
  }

  return Notifications.scheduleNotificationAsync({
    content: { body, data, title },
    trigger: {
      channelId: Platform.OS === 'android' ? channelId : undefined,
      date,
      type: Notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

/** Cancela una notificación programada. No falla si ya no existe. */
export async function cancelLocalNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(
    () => undefined,
  );
}
