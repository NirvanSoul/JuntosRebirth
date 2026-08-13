import {
  createClient,
  processLock,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import {
  supabaseEnvironment,
  type SupabaseEnvironment,
} from '@/app/config/environment';

const secureSessionStorage: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * En nativo, `expo-secure-store` guarda el token en Keychain/Keystore, fuera
 * del alcance de cualquier JS que corra en la app. El navegador no tiene un
 * equivalente: cualquier storage accesible desde JS (`localStorage`,
 * `sessionStorage`, IndexedDB) queda expuesto por igual a un XSS. Se usa
 * `sessionStorage` en vez de `localStorage` (el valor por defecto de
 * `AsyncStorage` en web) para acotar la ventana de exposición: el token
 * desaparece al cerrar la pestaña/navegador en vez de sobrevivir
 * indefinidamente en disco. Ver ADR-075.
 */
const webSessionStorage: SupportedStorage = {
  getItem: (key) => Promise.resolve(window.sessionStorage.getItem(key)),
  setItem: (key, value) => {
    window.sessionStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    window.sessionStorage.removeItem(key);
    return Promise.resolve();
  },
};

let configuredClient: SupabaseClient | null = null;

export function createSupabaseClient(
  environment: SupabaseEnvironment,
): SupabaseClient {
  return createClient(environment.url, environment.publishableKey, {
    auth: {
      storage: Platform.OS === 'web' ? webSessionStorage : secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
}

export function getConfiguredSupabaseClient(): SupabaseClient {
  if (!supabaseEnvironment) {
    throw new Error(
      'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }
  configuredClient ??= createSupabaseClient(supabaseEnvironment);
  return configuredClient;
}
