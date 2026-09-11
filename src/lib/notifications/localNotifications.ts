import { Platform } from 'react-native';

import { getNotificationModule } from '@/lib/notifications/notificationRuntime';

const androidReminderChannelId = 'transaction-reminders';
const androidDailyEngagementChannelId = 'daily-engagement';

let isHandlerRegistered = false;
let isAndroidReminderChannelEnsured = false;
let isAndroidDailyEngagementChannelEnsured = false;

/** Controla cómo se presenta una notificación mientras la app está en primer plano. */
export async function ensureNotificationHandlerRegistered(): Promise<void> {
  if (isHandlerRegistered) return;
  const notifications = getNotificationModule();
  if (!notifications) return;

  isHandlerRegistered = true;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidReminderChannel(
  notifications: NonNullable<ReturnType<typeof getNotificationModule>>,
): Promise<void> {
  if (Platform.OS !== 'android' || isAndroidReminderChannelEnsured) return;
  isAndroidReminderChannelEnsured = true;

  await notifications.setNotificationChannelAsync(androidReminderChannelId, {
    importance: notifications.AndroidImportance.HIGH,
    name: 'Recordatorios de movimientos',
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function ensureAndroidDailyEngagementChannel(
  notifications: NonNullable<ReturnType<typeof getNotificationModule>>,
): Promise<void> {
  if (Platform.OS !== 'android' || isAndroidDailyEngagementChannelEnsured) {
    return;
  }
  isAndroidDailyEngagementChannelEnsured = true;

  await notifications.setNotificationChannelAsync(
    androidDailyEngagementChannelId,
    {
      importance: notifications.AndroidImportance.DEFAULT,
      name: 'Recordatorio diario',
      vibrationPattern: [0, 250, 250, 250],
    },
  );
}

/** Solicita permiso de notificaciones si aún no fue concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  const notifications = getNotificationModule();
  if (!notifications) return false;
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await notifications.requestPermissionsAsync({
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
  const notifications = getNotificationModule();
  if (!notifications) {
    throw new Error('Las notificaciones no están disponibles en Expo Go');
  }
  const channelId =
    channel === 'dailyEngagement'
      ? androidDailyEngagementChannelId
      : androidReminderChannelId;

  if (channel === 'dailyEngagement') {
    await ensureAndroidDailyEngagementChannel(notifications);
  } else {
    await ensureAndroidReminderChannel(notifications);
  }

  return notifications.scheduleNotificationAsync({
    content: { body, data, title },
    trigger: {
      channelId: Platform.OS === 'android' ? channelId : undefined,
      date,
      type: notifications.SchedulableTriggerInputTypes.DATE,
    },
  });
}

export type ScheduledLocalNotification = {
  data: Record<string, unknown>;
  id: string;
  title: string | null;
};

/**
 * Expone solo los datos necesarios para que un servicio pueda reconciliar sus
 * propias notificaciones sin acceder directamente a Expo Notifications.
 */
export async function listScheduledLocalNotifications(): Promise<
  readonly ScheduledLocalNotification[]
> {
  const notifications = getNotificationModule();
  if (!notifications) return [];
  const scheduled = await notifications.getAllScheduledNotificationsAsync();

  return scheduled.map((notification) => ({
    data: notification.content.data ?? {},
    id: notification.identifier,
    title: notification.content.title,
  }));
}

/** Cancela una notificación programada. No falla si ya no existe. */
export async function cancelLocalNotification(id: string): Promise<void> {
  const notifications = getNotificationModule();
  if (!notifications) return;
  await notifications
    .cancelScheduledNotificationAsync(id)
    .catch(() => undefined);
}
