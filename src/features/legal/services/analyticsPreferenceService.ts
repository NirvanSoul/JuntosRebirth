import {
  getAnalyticsEnabled,
  setAnalyticsEnabled,
} from '@/features/legal/repositories/analyticsPreferenceRepository';
import { setClarityAnalyticsEnabled } from '@/services/analytics/clarityAnalytics';

async function applyClarityPreference(enabled: boolean): Promise<void> {
  try {
    await setClarityAnalyticsEnabled(enabled);
  } catch (error) {
    // Expo Go no carga módulos nativos de terceros. La preferencia se conserva
    // y se aplicará automáticamente en el siguiente development/release build.
    console.error('[clarityAnalytics] SDK no disponible en este build', error);
  }
}

export async function restoreAnalyticsPreference(): Promise<boolean> {
  const enabled = await getAnalyticsEnabled();
  await applyClarityPreference(enabled);
  return enabled;
}

export async function updateAnalyticsPreference(
  enabled: boolean,
): Promise<void> {
  await setAnalyticsEnabled(enabled);
  await applyClarityPreference(enabled);
}
