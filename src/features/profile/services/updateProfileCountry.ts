import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import type { LocalProfile } from '@/features/profile/types';
import { saveCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';
import { currencyPreferencesForCountry } from '@/state/appPreferences/currencyPreferences';

/**
 * Cambia el país desde Ajustes solo después de la aprobación remota. El
 * onboarding previo a Acceso puede guardarlo localmente sin intentar una
 * petición que todavía no está autorizada.
 */
export async function updateProfileCountry(
  countryCode: string,
  { sync = 'required' }: { sync?: 'deferred' | 'required' } = {},
): Promise<LocalProfile> {
  const normalized = countryCode.trim().toUpperCase();
  if (sync === 'required') {
    await syncOwnCountry(normalized, { throwOnFailure: true });
  }
  await saveCurrencyPreferences(currencyPreferencesForCountry(normalized));
  return saveLocalProfileCountry(normalized);
}
