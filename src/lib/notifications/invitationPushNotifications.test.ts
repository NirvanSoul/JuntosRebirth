import * as Notifications from 'expo-notifications';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { registerCurrentDeviceForInvitationPush } from '@/lib/notifications/invitationPushNotifications';
import { storeInvitationPushToken } from '@/lib/notifications/invitationPushTokenStore';

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

const mockedNotifications = jest.mocked(Notifications);

function createFakeClient(rpc = jest.fn()) {
  return { rpc } as unknown as SupabaseClient;
}

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
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      registerCurrentDeviceForInvitationPush(false, createFakeClient(rpc)),
    ).resolves.toBe('registered');

    expect(rpc).toHaveBeenCalledWith('register_current_user_push_token', {
      p_expo_push_token: 'ExponentPushToken[device_1]',
      p_platform: Platform.OS,
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
    const rpc = jest.fn();

    await expect(
      registerCurrentDeviceForInvitationPush(false, createFakeClient(rpc)),
    ).resolves.toBe('permission-denied');

    expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
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
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      registerCurrentDeviceForInvitationPush(true, createFakeClient(rpc)),
    ).resolves.toBe('registered');
    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});
