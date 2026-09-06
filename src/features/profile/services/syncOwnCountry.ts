import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

/**
 * Publica el país de la persona autenticada.
 *
 * Por defecto no lanza para los llamadores de sincronización en segundo plano.
 * Los cambios explícitos desde Ajustes pueden pedir que el error se propague:
 * el servidor debe aprobarlos antes de cambiar la copia local.
 */
export async function syncOwnCountry(
  countryCode: string,
  {
    ensureBootstrap = true,
    throwOnFailure = false,
  }: { ensureBootstrap?: boolean; throwOnFailure?: boolean } = {},
): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    if (throwOnFailure) {
      throw new Error('Debes iniciar sesión antes de cambiar tu país.');
    }
    return false;
  }

  try {
    // Para cambios desde Ajustes, Bootstrap garantiza que el perfil remoto
    // exista antes del PATCH. La inicialización de sesión ya lo ejecutó y
    // puede evitar una segunda petición usando `ensureBootstrap: false`.
    if (ensureBootstrap) await bootstrapRemoteAccount();
    // El perfil que se actualiza es el de la sesión: la API no acepta un
    // identificador de usuario en el cuerpo.
    await apiClient.patch('/v1/me/profile', { countryCode });
    return true;
  } catch (error) {
    if (throwOnFailure) throw error;
    console.error('[profiles] no se pudo publicar el país', { error });
    return false;
  }
}
