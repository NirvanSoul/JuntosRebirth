import type { SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { unregisterCurrentDeviceFromInvitationPush } from '@/lib/notifications/invitationPushTokenStore';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe('invitationPushTokenStore', () => {
  it('retira el token guardado antes de cerrar sesión', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      'ExponentPushToken[device_1]',
    );
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    await unregisterCurrentDeviceFromInvitationPush(client);

    expect(rpc).toHaveBeenCalledWith('unregister_current_user_push_token', {
      p_expo_push_token: 'ExponentPushToken[device_1]',
    });
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
