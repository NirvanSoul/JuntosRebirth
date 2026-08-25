import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { act, render, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { InvitationPushRegistration } from '@/lib/notifications/InvitationPushRegistration';
import { registerCurrentDeviceForInvitationPush } from '@/lib/notifications/invitationPushNotifications';

jest.mock('@/features/auth/hooks/useAuthSession');
jest.mock('@/hooks/useAppForeground', () => ({ useAppForeground: jest.fn() }));
jest.mock('@/lib/notifications/invitationPushNotifications', () => ({
  registerCurrentDeviceForInvitationPush: jest.fn(async () => 'registered'),
}));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
}));

const mockedNotifications = jest.mocked(Notifications);

describe('InvitationPushRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuthSession).mockReturnValue({
      isReady: true,
      session: { user: { id: 'user-1' } } as never,
      userId: 'user-1',
    });
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    mockedNotifications.addNotificationResponseReceivedListener.mockReturnValue(
      { remove: jest.fn() },
    );
  });

  it('explica el permiso y solo lo solicita después de pulsar Activar', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<InvitationPushRegistration />);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(registerCurrentDeviceForInvitationPush).not.toHaveBeenCalled();

    const [, , buttons] = alertSpy.mock.calls[0] ?? [];
    await act(async () =>
      buttons?.find(({ text }) => text === 'Activar')?.onPress?.(),
    );

    expect(registerCurrentDeviceForInvitationPush).toHaveBeenCalledWith(true);
  });

  it('abre Inicio cuando se toca un push de invitación', async () => {
    let listener:
      ((response: Notifications.NotificationResponse) => void) | null = null;
    mockedNotifications.addNotificationResponseReceivedListener.mockImplementation(
      (next) => {
        listener = next;
        return { remove: jest.fn() };
      },
    );
    const linkingSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    render(<InvitationPushRegistration />);

    await waitFor(() => expect(listener).not.toBeNull());
    await act(async () =>
      listener?.({
        notification: {
          request: { content: { data: { type: 'space_invitation' } } },
        },
      } as unknown as Notifications.NotificationResponse),
    );

    expect(linkingSpy).toHaveBeenCalledWith('juntoss://');
  });
});
