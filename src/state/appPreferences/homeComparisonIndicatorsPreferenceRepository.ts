import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultHomeComparisonIndicatorsPreference,
  type HomeComparisonIndicatorsPreference,
} from '@/state/appPreferences/homeComparisonIndicatorsPreference';

const homeComparisonIndicatorsStorageKey =
  '@juntoss/home-comparison-indicators/v1';

type StoredHomeComparisonIndicatorsPreference = {
  version: 1;
  enabled: boolean;
};

function parseStoredHomeComparisonIndicatorsPreference(
  value: string,
): HomeComparisonIndicatorsPreference {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('La preferencia de comparación de Inicio no es válida');
  }

  const candidate = parsed as Partial<StoredHomeComparisonIndicatorsPreference>;
  if (candidate.version !== 1 || typeof candidate.enabled !== 'boolean') {
    throw new Error('La preferencia de comparación de Inicio no es válida');
  }

  return { enabled: candidate.enabled };
}

export async function loadHomeComparisonIndicatorsPreference(): Promise<HomeComparisonIndicatorsPreference> {
  const stored = await AsyncStorage.getItem(homeComparisonIndicatorsStorageKey);

  if (stored === null) {
    return defaultHomeComparisonIndicatorsPreference;
  }

  try {
    return parseStoredHomeComparisonIndicatorsPreference(stored);
  } catch {
    return defaultHomeComparisonIndicatorsPreference;
  }
}

export async function saveHomeComparisonIndicatorsPreference(
  preference: HomeComparisonIndicatorsPreference,
): Promise<void> {
  const stored: StoredHomeComparisonIndicatorsPreference = {
    version: 1,
    enabled: preference.enabled,
  };

  await AsyncStorage.setItem(
    homeComparisonIndicatorsStorageKey,
    JSON.stringify(stored),
  );
}
