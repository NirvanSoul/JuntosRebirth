import AsyncStorage from '@react-native-async-storage/async-storage';

const analyticsEnabledStorageKey = '@juntoss/privacy/analytics-enabled/v1';

/**
 * La analítica está activada por defecto. La decisión se conserva en
 * el dispositivo y puede revocarse desde Preferencias de privacidad.
 */
export async function getAnalyticsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(analyticsEnabledStorageKey);
  if (stored === null) return true;
  return stored === 'true';
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(analyticsEnabledStorageKey, String(enabled));
}
