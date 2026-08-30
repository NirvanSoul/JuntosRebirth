import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerCurrentDeviceForInvitationPush } from '@/lib/notifications/invitationPushNotifications';
import { storeInvitationPushToken } from '@/lib/notifications/invitationPushTokenStore';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));

jest.mock('@/lib/notifications/invitationPushTokenStore', () => ({
  storeInvitationPushToken: jest.fn(async () => undefined),
}));

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { post: jest.fn() },
}));

const mockedNotifications = jest.mocked(Notifications);

describe('invitationPushNotifications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registra el token Expo cuando el permiso ya está concedido', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[device_1]',
      type: 'expo',
    });
    jest.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await expect(registerCurrentDeviceForInvitationPush(false)).resolves.toBe(
      'registered',
    );

    expect(apiClient.post).toHaveBeenCalledWith('/v1/me/push-tokens', {
      expoPushToken: 'ExponentPushToken[device_1]',
      platform: Platform.OS,
    });
    expect(storeInvitationPushToken).toHaveBeenCalledWith(
      'ExponentPushToken[device_1]',
    );
  });

  it('no solicita el permiso sin una acción explicada por la interfaz', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    await expect(registerCurrentDeviceForInvitationPush(false)).resolves.toBe(
      'permission-denied',
    );

    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('solicita y registra el permiso después de la confirmación del usuario', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExpoPushToken[device_2]',
      type: 'expo',
    });
    jest.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await expect(registerCurrentDeviceForInvitationPush(true)).resolves.toBe(
      'registered',
    );
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});
