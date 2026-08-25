import * as Notifications from 'expo-notifications';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { storeInvitationPushToken } from '@/lib/notifications/invitationPushTokenStore';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

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

/** Registra el dispositivo de la sesión actual sin exponer su token por RLS. */
export async function registerCurrentDeviceForInvitationPush(
  requestPermission: boolean,
  client: SupabaseClient = getConfiguredSupabaseClient(),
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
  const { error } = await client.rpc('register_current_user_push_token', {
    p_expo_push_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw new Error('No pudimos registrar este dispositivo.');
  await storeInvitationPushToken(token);
  return 'registered';
}
