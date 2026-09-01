import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  getLocalAvatarUpload,
  markAvatarUploadResult,
  saveDownloadedOwnAvatar,
  saveOwnRemoteAvatar,
} from '@/features/profile/repositories/localProfileRepository';
import {
  readAvatarBytes,
  storeOwnAvatarBytes,
} from '@/features/profile/services/avatarImageService';
import { File } from 'expo-file-system';
import { getAvatar, uploadAvatar } from '@/services/api/avatar';

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
  // Si la sesión desaparece durante una tarea de fondo, no se toca la caché.
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

    const avatar = await uploadAvatar(await readAvatarBytes(localPath));
    await saveOwnRemoteAvatar(localPath, avatar);
    return true;
  } catch (error) {
    console.error('[avatar] no se pudo subir la foto de perfil', { error });
    await markAvatarUploadResult(localPath, 'failed', null);
    return false;
  }
}

/**
 * Trae la foto propia desde el servidor cuando el dispositivo no la tiene.
 *
 * Es el caso de estrenar móvil o reinstalar: el censo del espacio incluye la
 * fila propia, así que de ahí sale el sello vigente. Se descarga por la misma
 * ruta autenticada que la de cualquier otro miembro; el cliente nunca compone
 * una dirección de almacenamiento.
 *
 * Cede siempre ante una subida pendiente: si en este móvil hay una foto que
 * todavía no ha salido, bajar la del servidor la borraría antes de publicarla.
 *
 * No lanza: quedarse sin foto degrada la interfaz al icono de respaldo.
 */
export async function restoreOwnAvatar(remote: {
  avatarPath: string | null;
  avatarUpdatedAt: string | null;
  userId: string;
}): Promise<boolean> {
  if (!remote.avatarPath || !remote.avatarUpdatedAt) return false;

  try {
    const { localPath, syncStatus, remoteUpdatedAt } =
      await getLocalAvatarUpload();
    if (syncStatus === 'pending' || syncStatus === 'failed') return false;
    // Nada que hacer si la copia local ya corresponde a ese sello.
    if (localPath && remoteUpdatedAt === remote.avatarUpdatedAt) return false;

    const bytes = await getAvatar(remote.userId, remote.avatarUpdatedAt);
    if (!bytes) return false;

    await saveDownloadedOwnAvatar({
      localPath: storeOwnAvatarBytes(bytes),
      avatarPath: remote.avatarPath,
      avatarUpdatedAt: remote.avatarUpdatedAt,
    });
    return true;
  } catch (error) {
    console.error('[avatar] no se pudo recuperar la foto de perfil', { error });
    return false;
  }
}
