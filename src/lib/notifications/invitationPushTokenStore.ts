import * as SecureStore from 'expo-secure-store';

import { apiClient } from '@/services/api/juntossApiClient';

const storedExpoPushTokenKey = 'juntoss-invitation-expo-push-token';

export async function storeInvitationPushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(storedExpoPushTokenKey, token);
}

/** Quita la asociación antes de cerrar sesión para no avisar a otra persona. */
export async function unregisterCurrentDeviceFromInvitationPush(): Promise<void> {
  const token = await SecureStore.getItemAsync(storedExpoPushTokenKey);
  if (!token) return;

  try {
    await apiClient.delete('/v1/me/push-tokens', { expoPushToken: token });
  } catch {
    throw new Error('No pudimos retirar este dispositivo.');
  }
  await SecureStore.deleteItemAsync(storedExpoPushTokenKey);
}
