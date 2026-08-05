import * as Notifications from 'expo-notifications';

import {
  cancelLocalNotification,
  ensureNotificationHandlerRegistered,
  requestNotificationPermission,
  scheduleLocalNotification,
} from '@/lib/notifications/localNotifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
}));

const mockedNotifications = jest.mocked(Notifications);

describe('localNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra el manejador de notificaciones una sola vez', () => {
    ensureNotificationHandlerRegistered();
    ensureNotificationHandlerRegistered();

    expect(mockedNotifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a pedir permiso si ya está concedido', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);

    const granted = await requestNotificationPermission();

    expect(granted).toBe(true);
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('pide permiso cuando aún no fue concedido ni rechazado permanentemente', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);

    const granted = await requestNotificationPermission();

    expect(granted).toBe(true);
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('no pide permiso de nuevo si el usuario ya lo rechazó de forma permanente', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: false,
      granted: false,
    } as Notifications.NotificationPermissionsStatus);

    const granted = await requestNotificationPermission();

    expect(granted).toBe(false);
    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('programa una notificación con disparador de tipo fecha', async () => {
    const date = new Date('2026-08-10T09:00:00');

    const id = await scheduleLocalNotification({
      body: 'Gasto de 45,00 €',
      date,
      title: 'Recordatorio: Alquiler',
    });

    expect(id).toBe('notification-id');
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        body: 'Gasto de 45,00 €',
        data: undefined,
        title: 'Recordatorio: Alquiler',
      },
      trigger: expect.objectContaining({ date, type: 'date' }),
    });
  });

  it('acepta el canal de recordatorio diario sin afectar el comportamiento por defecto', async () => {
    const date = new Date('2026-08-10T20:00:00');

    const id = await scheduleLocalNotification({
      body: 'Registra lo de hoy antes de que se te olvide.',
      channel: 'dailyEngagement',
      date,
      title: 'Un minuto para organizarte',
    });

    expect(id).toBe('notification-id');
    expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        body: 'Registra lo de hoy antes de que se te olvide.',
        data: undefined,
        title: 'Un minuto para organizarte',
      },
      trigger: expect.objectContaining({ date, type: 'date' }),
    });
  });

  it('cancela una notificación programada sin lanzar si ya no existe', async () => {
    mockedNotifications.cancelScheduledNotificationAsync.mockRejectedValueOnce(
      new Error('not found'),
    );

    await expect(cancelLocalNotification('missing')).resolves.toBeUndefined();
  });
});
