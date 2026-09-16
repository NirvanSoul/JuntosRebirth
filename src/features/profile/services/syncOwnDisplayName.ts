import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  getPendingLocalDisplayName,
  markDisplayNameSyncResult,
} from '@/features/profile/repositories/localProfileRepository';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

/**
 * Publica el nombre de la persona autenticada.
 *
 * El nombre es lo que ven las demás personas de un espacio compartido para
 * identificar quién registró cada movimiento. Nunca lanza: guardar el nombre
 * localmente no debe depender de la conectividad ni impedir que la persona
 * use la aplicación.
 */
export async function syncOwnDisplayName(
  displayName: string,
): Promise<boolean> {
  const trimmed = displayName.trim();
  if (!trimmed) return false;

  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  try {
    // El nombre se guarda al terminar el onboarding, que puede adelantarse a
    // la inicialización de sesión. Bootstrap es idempotente y garantiza que
    // el perfil remoto exista antes del PATCH.
    await bootstrapRemoteAccount();
    // El perfil que se actualiza es el de la sesión: la API no acepta un
    // identificador de usuario en el cuerpo.
    await apiClient.patch('/v1/me/profile', { displayName: trimmed });
    await markDisplayNameSyncResult(trimmed, 'synced');
    return true;
  } catch (error) {
    console.error('[profiles] no se pudo publicar el nombre', { error });
    await markDisplayNameSyncResult(trimmed, 'failed');
    return false;
  }
}

/** Reintenta únicamente cuando una publicación anterior quedó pendiente. */
export async function retryPendingDisplayNameSync(): Promise<boolean> {
  const pendingDisplayName = await getPendingLocalDisplayName();
  return pendingDisplayName ? syncOwnDisplayName(pendingDisplayName) : false;
}
