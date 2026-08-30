import * as SecureStore from 'expo-secure-store';

import { unregisterCurrentDeviceFromInvitationPush } from '@/lib/notifications/invitationPushTokenStore';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { delete: jest.fn(async () => undefined) },
}));

const mockedSecureStore = jest.mocked(SecureStore);
const mockedApiClient = jest.mocked(apiClient);

describe('invitationPushTokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retira el token guardado antes de cerrar sesión', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      'ExponentPushToken[device_1]',
    );

    await unregisterCurrentDeviceFromInvitationPush();

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/v1/me/push-tokens', {
      expoPushToken: 'ExponentPushToken[device_1]',
    });
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('no llama a la API cuando este dispositivo no tiene token', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);

    await unregisterCurrentDeviceFromInvitationPush();

    expect(mockedApiClient.delete).not.toHaveBeenCalled();
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('conserva el token si la API falla, para poder reintentar', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(
      'ExponentPushToken[device_1]',
    );
    mockedApiClient.delete.mockRejectedValueOnce(new Error('offline'));

    await expect(unregisterCurrentDeviceFromInvitationPush()).rejects.toThrow(
      'No pudimos retirar este dispositivo.',
    );
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
