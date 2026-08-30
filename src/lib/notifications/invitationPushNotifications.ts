import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { storeInvitationPushToken } from '@/lib/notifications/invitationPushTokenStore';
import { apiClient } from '@/services/api/juntossApiClient';

const invitationChannelId = 'space-invitations';

export type InvitationPushRegistrationResult =
  'registered' | 'permission-denied' | 'unsupported';

async function ensureInvitationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(invitationChannelId, {
    importance: Notifications.AndroidImportance.HIGH,
    name: 'Invitaciones de pareja',
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Registra el dispositivo de la sesión actual; la API lo asocia a quien la abre. */
export async function registerCurrentDeviceForInvitationPush(
  requestPermission: boolean,
): Promise<InvitationPushRegistrationResult> {
  if (Platform.OS === 'web') return 'unsupported';

  await ensureInvitationChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
  }
  if (!permission.granted) return 'permission-denied';

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  try {
    await apiClient.post('/v1/me/push-tokens', {
      expoPushToken: token,
      platform: Platform.OS,
    });
  } catch {
    throw new Error('No pudimos registrar este dispositivo.');
  }
  // Se guarda solo si el servidor lo aceptó: si no, no habría nada que
  // retirar al cerrar sesión.
  await storeInvitationPushToken(token);
  return 'registered';
}
