import { Directory, File, Paths } from 'expo-file-system';

import { buildAvatarCacheFileName } from '@/features/profile/services/avatarImage';
import {
  listSpaceMemberProfiles,
  saveSpaceMemberAvatarCache,
} from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { getAvatar } from '@/services/api/avatar';

const memberAvatarsDirectoryName = 'avatars/members';

function getMemberAvatarsDirectory(): Directory {
  const directory = new Directory(Paths.document, memberAvatarsDirectoryName);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Descarga y cachea las fotos de las demás personas del espacio.
 *
 * Baja siempre por `GET /v1/avatars/:userId`: el cliente no conoce ni construye
 * la dirección del objeto en el almacenamiento, solo la de la API, que además
 * comprueba que quien pide comparte espacio con quien aparece.
 *
 * Solo baja lo que ha cambiado. La clave de caché es `userId` +
 * `avatarUpdatedAt`, incrustada en el nombre del archivo: si ya existe, no hay
 * nada que hacer; si el sello cambió, el nombre cambia y fuerza la descarga.
 * Sin esa comprobación, cada sincronización redescargaría la misma foto.
 *
 * No lanza nunca. Quedarse sin la foto de la otra persona degrada la interfaz
 * al icono de respaldo, que es un resultado aceptable; abortar la
 * sincronización del espacio por ello no lo sería.
 */
export async function cacheMemberAvatars(spaceId: string): Promise<void> {
  let profiles;
  try {
    profiles = await listSpaceMemberProfiles(spaceId);
  } catch (error) {
    console.error('[avatar] no se pudo leer el censo para cachear fotos', {
      spaceId,
      error,
    });
    return;
  }

  const directory = getMemberAvatarsDirectory();
  const expectedFileNames = new Set<string>();

  for (const profile of profiles) {
    if (!profile.avatarPath || !profile.avatarUpdatedAt) continue;

    const fileName = buildAvatarCacheFileName(
      profile.userId,
      profile.avatarUpdatedAt,
    );
    expectedFileNames.add(fileName);

    const destination = new File(directory, fileName);
    if (destination.exists) continue;

    try {
      const bytes = await getAvatar(profile.userId, profile.avatarUpdatedAt);
      // `null` es «todavía no tiene foto», no un fallo: no se escribe nada y no
      // se registra ruido en la consola.
      if (!bytes) continue;

      destination.create();
      destination.write(bytes);
      await saveSpaceMemberAvatarCache(
        spaceId,
        profile.userId,
        destination.uri,
      );
    } catch (error) {
      console.error('[avatar] no se pudo cachear la foto de un miembro', {
        userId: profile.userId,
        error,
      });
    }
  }

  removeStaleAvatars(directory, expectedFileNames);
}

/**
 * Borra las copias que ya no corresponden a nadie del censo.
 *
 * Cubre los dos casos que dejarían basura creciendo en el dispositivo: alguien
 * que cambia de foto —su archivo viejo conserva el sello anterior— y alguien
 * que abandona el espacio y desaparece del censo.
 */
function removeStaleAvatars(
  directory: Directory,
  expectedFileNames: ReadonlySet<string>,
): void {
  try {
    for (const entry of directory.list()) {
      const name = entry.uri.split('/').pop();
      if (entry instanceof File && name && !expectedFileNames.has(name)) {
        entry.delete();
      }
    }
  } catch (error) {
    console.error('[avatar] no se pudieron limpiar las fotos obsoletas', {
      error,
    });
  }
}
