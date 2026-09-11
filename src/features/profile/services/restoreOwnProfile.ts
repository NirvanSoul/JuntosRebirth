import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { apiClient } from '@/services/api/juntossApiClient';

/** Copia el país del perfil remoto en SQLite al iniciar una sesión nueva. */
export async function restoreOwnProfile(): Promise<void> {
  const response = await apiClient.get<{
    data?: { profile?: { countryCode?: unknown } | null };
  }>('/v1/me');
  const countryCode = response.data?.profile?.countryCode;
  if (typeof countryCode === 'string' && /^[A-Za-z]{2}$/.test(countryCode)) {
    await saveLocalProfileCountry(countryCode);
  }
}
