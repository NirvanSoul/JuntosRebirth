import {
  getAnalyticsEnabled,
  setAnalyticsEnabled,
} from '@/features/legal/repositories/analyticsPreferenceRepository';
import { setClarityAnalyticsEnabled } from '@/services/analytics/clarityAnalytics';

async function applyClarityPreference(enabled: boolean): Promise<void> {
  try {
    await setClarityAnalyticsEnabled(enabled);
  } catch (error) {
    // La ausencia del módulo nativo se resuelve en el adaptador. Registrar
    // únicamente fallos inesperados al aplicar la preferencia.
    console.error(
      '[clarityAnalytics] No se pudo aplicar la preferencia',
      error,
    );
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
