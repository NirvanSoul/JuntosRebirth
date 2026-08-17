import { saveLocalProfileAvatar } from '@/features/profile/repositories/localProfileRepository';
import { pickAndStoreAvatar } from '@/features/profile/services/avatarImageService';
import { syncOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import type { AvatarPickSource, LocalProfile } from '@/features/profile/types';

/**
 * Cambia la foto de perfil: la elige, la comprime, la guarda y la publica.
 *
 * Punto de entrada único desde Ajustes, para que la pantalla no tenga que
 * conocer el circuito de subida ni su orden.
 *
 * La subida se dispara sin esperarla a propósito: la foto ya está guardada en
 * el dispositivo y marcada como pendiente, así que la interfaz puede mostrarla
 * de inmediato y la red se resuelve en segundo plano. `syncOwnAvatar` no lanza,
 * de modo que un fallo aquí no puede romper la pantalla.
 *
 * Devuelve `null` si la persona cancela el selector, que no es un error.
 */
export async function updateProfileAvatar(
  source: AvatarPickSource,
): Promise<LocalProfile | null> {
  const avatarPath = await pickAndStoreAvatar(source);
  if (!avatarPath) return null;

  const profile = await saveLocalProfileAvatar(avatarPath);
  void syncOwnAvatar();
  return profile;
}
