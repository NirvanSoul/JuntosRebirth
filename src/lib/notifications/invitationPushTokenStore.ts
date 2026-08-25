import type { SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

const storedExpoPushTokenKey = 'juntoss-invitation-expo-push-token';

export async function storeInvitationPushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(storedExpoPushTokenKey, token);
}

/** Quita la asociación antes de cerrar sesión para no avisar a otra persona. */
export async function unregisterCurrentDeviceFromInvitationPush(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<void> {
  const token = await SecureStore.getItemAsync(storedExpoPushTokenKey);
  if (!token) return;

  const { error } = await client.rpc('unregister_current_user_push_token', {
    p_expo_push_token: token,
  });
  if (error) throw new Error('No pudimos retirar este dispositivo.');
  await SecureStore.deleteItemAsync(storedExpoPushTokenKey);
}
