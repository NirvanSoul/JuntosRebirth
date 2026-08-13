import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultAppPreferences,
  type AppPreferences,
} from '@/state/appPreferences/types';
import type { AppearancePreference } from '@/theme/types';

const appPreferencesStorageKey = '@juntoss/app-preferences/v1';

type StoredAppPreferences = {
  version: 1;
  appearance: AppearancePreference;
};

function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function parseStoredPreferences(value: string): AppPreferences {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Las preferencias guardadas no son válidas');
  }

  const candidate = parsed as Partial<StoredAppPreferences>;
  if (
    candidate.version !== 1 ||
    !isAppearancePreference(candidate.appearance)
  ) {
    throw new Error('Las preferencias guardadas no son válidas');
  }

  return { appearance: candidate.appearance };
}

export async function loadAppPreferences(): Promise<AppPreferences> {
  const stored = await AsyncStorage.getItem(appPreferencesStorageKey);

  if (stored === null) {
    return defaultAppPreferences;
  }

  try {
    return parseStoredPreferences(stored);
  } catch {
    return defaultAppPreferences;
  }
}

export async function saveAppPreferences(
  preferences: AppPreferences,
): Promise<void> {
  const stored: StoredAppPreferences = {
    version: 1,
    appearance: preferences.appearance,
  };

  await AsyncStorage.setItem(appPreferencesStorageKey, JSON.stringify(stored));
}
