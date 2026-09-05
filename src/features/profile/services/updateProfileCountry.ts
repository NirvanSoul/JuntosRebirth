import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import type { LocalProfile } from '@/features/profile/types';

/**
 * Cambia el país desde onboarding o Ajustes solo después de la aprobación
 * remota. Un país incompatible con un espacio compartido no puede quedarse
 * guardado localmente mientras el servidor lo rechaza.
 */
export async function updateProfileCountry(
  countryCode: string,
): Promise<LocalProfile> {
  const normalized = countryCode.trim().toUpperCase();
  await syncOwnCountry(normalized, { throwOnFailure: true });
  return saveLocalProfileCountry(normalized);
}
