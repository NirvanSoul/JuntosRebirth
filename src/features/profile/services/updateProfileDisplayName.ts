import { saveLocalProfileDisplayName } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnDisplayName } from '@/features/profile/services/syncOwnDisplayName';
import type { LocalProfile } from '@/features/profile/types';

/**
 * Cambia el nombre desde Ajustes: lo guarda en el dispositivo al instante y
 * publica el cambio en segundo plano.
 *
 * El guardado local nunca espera a la red, igual que la moneda principal
 * (`syncOwnDefaultCurrency`): la persona ve su nombre nuevo de inmediato y, si
 * falla la subida, se registra el error sin deshacer el cambio en pantalla.
 */
export async function updateProfileDisplayName(
  displayName: string,
): Promise<LocalProfile> {
  const trimmed = displayName.trim();
  const profile = await saveLocalProfileDisplayName(trimmed);
  void syncOwnDisplayName(trimmed);
  return profile;
}
