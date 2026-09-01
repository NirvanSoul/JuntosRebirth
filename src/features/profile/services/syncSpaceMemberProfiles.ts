import { fetchSpaceMemberProfiles } from '@/features/profile/gateways/juntossSpaceMemberProfileGateway';
import { cacheMemberAvatars } from '@/features/profile/services/cacheMemberAvatars';
import { restoreOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { replaceSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';

/**
 * Refresca el censo local de un espacio compartido.
 *
 * Devuelve `false` sin tocar nada cuando la sesión desaparece. No borra el
 * censo previo en ese caso, para no dejar sin nombre a los movimientos ya
 * bajados mientras la interfaz vuelve a la pantalla de acceso.
 */
export async function syncSpaceMemberProfiles(
  spaceId: string,
): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const profiles = await fetchSpaceMemberProfiles(spaceId);
  await replaceSpaceMemberProfiles(spaceId, profiles);

  // La fila propia del censo es la única fuente del sello remoto propio, así
  // que aquí es donde se detecta que el servidor tiene una foto que este
  // dispositivo todavía no ha bajado.
  const own = profiles.find((profile) => profile.userId === userId);
  if (own) {
    await restoreOwnAvatar({
      userId,
      avatarPath: own.avatarPath,
      avatarUpdatedAt: own.avatarUpdatedAt,
    });
  }

  // Después de guardar el censo, no antes: la caché decide qué descargar
  // comparando contra los sellos que acaban de llegar.
  await cacheMemberAvatars(spaceId);
  return true;
}
