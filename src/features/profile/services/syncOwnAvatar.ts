import { File } from 'expo-file-system';

import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  buildAvatarPath,
  uploadOwnAvatar,
} from '@/features/profile/gateways/supabaseAvatarStorageGateway';
import {
  getLocalAvatarUpload,
  markAvatarUploadResult,
} from '@/features/profile/repositories/localProfileRepository';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

/**
 * Sube la foto de perfil propia si hay alguna pendiente.
 *
 * Es idempotente y barata de llamar: sale sin tocar nada cuando no hay sesión,
 * no hay foto o ya está subida, de modo que puede invocarse en cada arranque y
 * en cada cambio de espacio sin coordinación.
 *
 * Nunca lanza. Un fallo de red deja la fila en `failed`, que el siguiente
 * intento vuelve a tratar como pendiente: la foto se sube sola cuando vuelva la
 * cobertura, sin que la persona tenga que repetir nada.
 */
export async function syncOwnAvatar(): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  // En modo invitado no hay a quién asociar la foto: se queda en el dispositivo
  // y subirá en cuanto la persona se registre.
  if (!userId) return false;

  const { localPath, syncStatus } = await getLocalAvatarUpload();
  if (!localPath) return false;
  if (syncStatus !== 'pending' && syncStatus !== 'failed') return false;

  try {
    const file = new File(localPath);
    if (!file.exists) {
      // El archivo se perdió (limpieza del sistema, restauración): no hay nada
      // que subir y reintentarlo en cada arranque sería inútil.
      await markAvatarUploadResult(localPath, 'failed', null);
      return false;
    }

    const remotePath = await uploadOwnAvatar(userId, await file.bytes());

    const client = getConfiguredSupabaseClient();
    const { error } = await client
      .from('profiles')
      .update({
        avatar_path: buildAvatarPath(userId),
        avatar_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw new Error('No pudimos publicar tu foto de perfil');

    await markAvatarUploadResult(localPath, 'synced', remotePath);
    return true;
  } catch (error) {
    console.error('[avatar] no se pudo subir la foto de perfil', { error });
    await markAvatarUploadResult(localPath, 'failed', null);
    return false;
  }
}
