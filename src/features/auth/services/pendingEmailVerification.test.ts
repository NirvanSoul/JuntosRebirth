import * as SecureStore from 'expo-secure-store';

import {
  clearPendingEmailVerification,
  loadPendingEmailVerification,
  savePendingEmailVerification,
} from '@/features/auth/services/pendingEmailVerification';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

const key = 'juntoss.pending-email-verification';

describe('pendingEmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('conserva y recupera únicamente el correo pendiente', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockResolvedValueOnce('ana@ejemplo.com');

    await savePendingEmailVerification('ana@ejemplo.com');

    await expect(loadPendingEmailVerification()).resolves.toBe(
      'ana@ejemplo.com',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      key,
      'ana@ejemplo.com',
    );
  });

  it('elimina el marcador al terminar la verificación', async () => {
    await clearPendingEmailVerification();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
  });
});
