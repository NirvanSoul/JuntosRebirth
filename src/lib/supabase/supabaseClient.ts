import AsyncStorage from '@react-native-async-storage/async-storage';
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

let configuredClient: SupabaseClient | null = null;

export function createSupabaseClient(
  environment: SupabaseEnvironment,
): SupabaseClient {
  return createClient(environment.url, environment.publishableKey, {
    auth: {
      storage: Platform.OS === 'web' ? AsyncStorage : secureSessionStorage,
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
