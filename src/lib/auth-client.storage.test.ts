import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

import './auth-client';

jest.unmock('@/lib/auth-client');

jest.mock('@better-auth/expo/client', () => ({ expoClient: jest.fn() }));
jest.mock('better-auth/react', () => ({ createAuthClient: jest.fn() }));
jest.mock('better-auth/client/plugins', () => ({ emailOTPClient: jest.fn() }));
jest.mock('@/app/config/environment', () => ({
  apiEnvironment: { url: 'https://api.test' },
}));
jest.mock('expo-secure-store', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
const storage = jest.mocked(expoClient).mock.calls[0]![0].storage;
const locked = new Error('KeyChainException: User interaction is not allowed.');
const removed = jest.fn();
let onState: (state: AppStateStatus) => void;

describe('Better Auth secure storage lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    AppState.currentState = 'active';
    Platform.OS = 'ios';
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        onState = listener;
        return { remove: removed };
      });
    jest
      .mocked(SecureStore.getItemAsync)
      .mockReset()
      .mockResolvedValue('cookie');
    jest
      .mocked(SecureStore.setItemAsync)
      .mockReset()
      .mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('defers reading until iOS becomes active', async () => {
    AppState.currentState = 'background';
    const result = storage.getItemAsync('juntoss_cookie');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    onState('active');
    await expect(result).resolves.toBe('cookie');
    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('retries a brief Keychain lock without treating it as an absent cookie', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(locked);
    const result = storage.getItemAsync('juntoss_cookie');
    const check = expect(result).resolves.toBe('cookie');
    await jest.runAllTimersAsync();
    await check;
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('bounds persistent Keychain failures and preserves credentials', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValue(locked);
    const result = storage.getItemAsync('juntoss_cookie');
    const check = expect(result).rejects.toMatchObject({
      code: 'SESSION_STORAGE_UNAVAILABLE',
    });
    await jest.runAllTimersAsync();
    await check;
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(3);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('times out background reads and removes the lifecycle listener', async () => {
    AppState.currentState = 'background';
    const result = storage.getItemAsync('juntoss_cookie');
    const check = expect(result).rejects.toMatchObject({
      code: 'SESSION_STORAGE_UNAVAILABLE',
    });
    await jest.runAllTimersAsync();
    await check;
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('defers writes without changing accessibility or the cookie key', async () => {
    AppState.currentState = 'inactive';
    const result = storage.setItemAsync('juntoss_cookie', 'new-cookie');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    onState('active');
    await result;
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'juntoss_cookie',
      'new-cookie',
      undefined,
    );
  });

  it('leaves Android storage accessible while backgrounded', async () => {
    Platform.OS = 'android';
    AppState.currentState = 'background';
    await expect(storage.getItemAsync('juntoss_cookie')).resolves.toBe(
      'cookie',
    );
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('propagates unrelated storage errors without retrying', async () => {
    const failure = new Error('Unsupported key');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(failure);
    await expect(storage.getItemAsync('juntoss_cookie')).rejects.toBe(failure);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);
  });
});
