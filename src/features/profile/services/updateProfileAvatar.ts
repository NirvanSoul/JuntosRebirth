import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  clearLocalProfileAvatar,
  getLocalProfile,
  saveLocalProfileAvatar,
  saveOwnRemoteAvatar,
} from '@/features/profile/repositories/localProfileRepository';
import { getAvatarErrorCode } from '@/features/profile/services/avatarErrorCopy';
import {
  pickAvatarImage,
  prepareAvatarImage,
  recompressAvatarImage,
  storeAvatarPermanently,
  readAvatarBytes,
  type PickedAvatar,
  type PreparedAvatar,
} from '@/features/profile/services/avatarImageService';
import type { AvatarPickSource, LocalProfile } from '@/features/profile/types';
import { deleteAvatar, uploadAvatar } from '@/services/api/avatar';

/** Fases que la interfaz distingue mientras se cambia la foto. */
export type AvatarFlowStage =
  'idle' | 'picking' | 'processing' | 'uploading' | 'success' | 'error';

type StageListener = (stage: AvatarFlowStage) => void;

/**
 * Cerrojo de módulo, no del componente.
 *
 * Dos pantallas montadas a la vez —o un doble toque que el `disabled` no llegue
 * a atrapar— podrían lanzar dos subidas contra la misma clave remota, y la que
 * terminara última ganaría aunque fuese la foto más antigua. Bloquear aquí
 * hace imposible esa carrera, en vez de intentar ordenarla después.
 */
let isFlowInProgress = false;

/**
 * Sube la foto y, si el servidor la rechaza por peso, la recomprime una vez.
 *
 * La rama se decide por `error.code` y nunca por el texto del mensaje: el
 * servidor puede reescribirlo, el código es el contrato. Un segundo
 * `AVATAR_TOO_LARGE` se propaga tal cual, porque a esa foto ya no se le puede
 * pedir más y lo que toca es elegir otra.
 */
async function uploadWithSingleRetry(
  picked: PickedAvatar,
  prepared: PreparedAvatar,
) {
  try {
    return {
      avatar: await uploadAvatar(await readAvatarBytes(prepared.uri)),
      uploadedUri: prepared.uri,
    };
  } catch (error) {
    if (getAvatarErrorCode(error) !== 'AVATAR_TOO_LARGE') throw error;

    // Se devuelve la uri que de verdad se subió: guardar la del primer intento
    // dejaría en el móvil una foto distinta de la que ve la otra persona.
    const smaller = await recompressAvatarImage(picked, prepared.quality);
    return {
      avatar: await uploadAvatar(await readAvatarBytes(smaller.uri)),
      uploadedUri: smaller.uri,
    };
  }
}

/**
 * Cambia la foto de perfil: la elige, la valida, la comprime, la sube y la
 * guarda. Punto de entrada único desde Ajustes, para que la pantalla no
 * conozca ni el pipeline de imagen ni el circuito de red.
 *
 * Con sesión, la foto no se da por cambiada hasta que `PUT /v1/me/avatar`
 * responde 2xx: mostrarla antes prometería a la persona algo que su pareja
 * todavía no puede ver. Sin sesión —modo invitado— sí se guarda en local con
 * estado pendiente, y `syncOwnAvatar` la publicará en cuanto haya cuenta.
 *
 * Devuelve `null` si la persona cancela el selector, que no es un error.
 */
export async function updateProfileAvatar(
  source: AvatarPickSource,
  onStage: StageListener = () => {},
): Promise<LocalProfile | null> {
  if (isFlowInProgress) return null;
  isFlowInProgress = true;

  try {
    onStage('picking');
    const picked = await pickAvatarImage(source);
    if (!picked) {
      onStage('idle');
      return null;
    }

    onStage('processing');
    const prepared = await prepareAvatarImage(picked);

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      const profile = await saveLocalProfileAvatar(
        storeAvatarPermanently(prepared.uri),
      );
      onStage('success');
      return profile;
    }

    onStage('uploading');
    const { avatar, uploadedUri } = await uploadWithSingleRetry(
      picked,
      prepared,
    );

    // El archivo solo se instala en el dispositivo después del 2xx, así que un
    // fallo no deja una foto en pantalla que el servidor no tiene.
    const localPath = storeAvatarPermanently(uploadedUri);
    await saveLocalProfileAvatar(localPath);
    await saveOwnRemoteAvatar(localPath, avatar);

    onStage('success');
    return getLocalProfile();
  } catch (error) {
    onStage('error');
    throw error;
  } finally {
    isFlowInProgress = false;
  }
}

/**
 * Borra la foto de perfil de verdad, no solo en pantalla.
 *
 * El estado local solo se limpia tras el 204: si la llamada falla, la persona
 * sigue viendo la foto que su pareja también sigue viendo, que es la verdad.
 */
export async function removeProfileAvatar(): Promise<LocalProfile> {
  // Mismo cerrojo que la subida: borrar a la vez que se sube dejaría el estado
  // local y el remoto contando historias distintas.
  if (isFlowInProgress) return getLocalProfile();
  isFlowInProgress = true;

  try {
    const userId = await getAuthenticatedUserId();
    if (userId) await deleteAvatar();
    return await clearLocalProfileAvatar();
  } finally {
    isFlowInProgress = false;
  }
}
