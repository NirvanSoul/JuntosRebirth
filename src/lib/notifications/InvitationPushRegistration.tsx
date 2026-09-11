import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as Notifications from 'expo-notifications';
import { useCallback, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import { useAppForeground } from '@/hooks/useAppForeground';
import { registerCurrentDeviceForInvitationPush } from '@/lib/notifications/invitationPushNotifications';
import {
  getNotificationModule,
  isNotificationModuleAvailable,
} from '@/lib/notifications/notificationRuntime';

const promptKeyPrefix = 'juntoss-invitation-push-prompted-v1:';

function openInvitationInbox(
  response: Notifications.NotificationResponse | null,
) {
  const data = response?.notification.request.content.data;
  if (data?.type !== 'space_invitation') return;
  void Linking.openURL('juntoss://').catch(() => undefined);
}

/** Explica el permiso una vez por cuenta y mantiene actualizado el token. */
export function InvitationPushRegistration() {
  const { session } = useAuthSession();
  const isExpoGo = !isNotificationModuleAvailable();

  const registerIfAuthorized = useCallback(() => {
    if (!session || Platform.OS === 'web' || isExpoGo) return;
    void registerCurrentDeviceForInvitationPush(false).catch(() => undefined);
  }, [isExpoGo, session]);

  useAppForeground(registerIfAuthorized);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo) return;
    let isMounted = true;
    let subscription: { remove: () => void } | undefined;
    const notifications = getNotificationModule();
    if (!notifications) return;
    subscription =
      notifications.addNotificationResponseReceivedListener(
        openInvitationInbox,
      );
    void notifications
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (!isMounted) return;
        openInvitationInbox(response);
        if (response) {
          void notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [isExpoGo]);

  useEffect(() => {
    if (!session || Platform.OS === 'web' || isExpoGo) return;
    let isMounted = true;
    const promptKey = `${promptKeyPrefix}${session.user.id}`;

    const notifications = getNotificationModule();
    if (!notifications) return;
    void notifications
      .getPermissionsAsync()
      .then(async (permission) => {
        if (!isMounted) return;
        if (permission.granted) {
          registerIfAuthorized();
          return;
        }
        if (!permission.canAskAgain) return;

        const alreadyPrompted = await AsyncStorage.getItem(promptKey);
        if (!isMounted || alreadyPrompted) return;
        Alert.alert(
          'Activa las notificaciones',
          'Juntoss puede avisarte cuando alguien te invite a compartir un espacio. No mostraremos datos financieros en la pantalla bloqueada.',
          [
            {
              style: 'cancel',
              text: 'Ahora no',
              onPress: () => void AsyncStorage.setItem(promptKey, 'dismissed'),
            },
            {
              text: 'Activar',
              onPress: () => {
                void AsyncStorage.setItem(promptKey, 'requested');
                void registerCurrentDeviceForInvitationPush(true).catch(
                  () => undefined,
                );
              },
            },
          ],
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isExpoGo, registerIfAuthorized, session]);

  return null;
}
