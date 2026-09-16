import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const KEYCHAIN_RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 3;
const pending = new Map<string, Promise<unknown>>();

export class SessionStorageUnavailableError extends Error {
  readonly code = 'SESSION_STORAGE_UNAVAILABLE';

  constructor() {
    super('Desbloquea el dispositivo y vuelve a la app para continuar.');
    this.name = 'SessionStorageUnavailableError';
  }
}

function isLockedKeychain(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === 'string' &&
    /user interaction is not allowed/i.test(message)
  );
}

function waitForForeground(): Promise<void> {
  if (Platform.OS !== 'ios' || AppState.currentState === 'active')
    return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      subscription.remove();
      resolve();
    });
    // Cubre una transición ocurrida mientras se registraba el listener.
    if (AppState.currentState === 'active') {
      subscription.remove();
      resolve();
    }
  });
}

async function withAccessibleKeychain<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await waitForForeground();
    try {
      return await operation();
    } catch (error) {
      if (!isLockedKeychain(error)) throw error;
      if (attempt === MAX_ATTEMPTS - 1)
        throw new SessionStorageUnavailableError();
      await new Promise((resolve) =>
        setTimeout(resolve, KEYCHAIN_RETRY_DELAY_MS),
      );
    }
  }
  throw new SessionStorageUnavailableError();
}

/** Mantiene el orden de lecturas/escrituras de una clave al volver a primer plano. */
function runAsync<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = pending.get(key);
  let task: Promise<T>;
  task = (
    previous
      ? previous
          .catch(() => undefined)
          .then(() => withAccessibleKeychain(operation))
      : withAccessibleKeychain(operation)
  ).finally(() => {
    if (pending.get(key) === task) pending.delete(key);
  });
  pending.set(key, task);
  return task;
}

function runSync<T>(key: string, operation: () => T): T {
  if (
    pending.has(key) ||
    (Platform.OS === 'ios' && AppState.currentState !== 'active')
  ) {
    throw new SessionStorageUnavailableError();
  }
  try {
    return operation();
  } catch (error) {
    if (isLockedKeychain(error)) throw new SessionStorageUnavailableError();
    throw error;
  }
}

/** Conserva las claves, opciones y protección nativa de SecureStore. */
export const authSecureStorage: Pick<
  typeof SecureStore,
  'getItem' | 'getItemAsync' | 'setItem' | 'setItemAsync'
> = {
  getItem: (key, options) =>
    runSync(key, () => SecureStore.getItem(key, options)),
  getItemAsync: (key, options) =>
    runAsync(key, () => SecureStore.getItemAsync(key, options)),
  setItem: (key, value, options) =>
    runSync(key, () => SecureStore.setItem(key, value, options)),
  setItemAsync: (key, value, options) =>
    runAsync(key, () => SecureStore.setItemAsync(key, value, options)),
};
