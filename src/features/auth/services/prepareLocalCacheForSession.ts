import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  discardBackedLocalSessionCache,
  pendingDiscardCatalogueKey,
} from '@/features/auth/services/discardBackedLocalSessionCache';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import {
  claimLocalCacheOwnership,
  classifyLocalCacheOwnership,
} from '@/features/sync/repositories/localSyncAccountRepository';
import { LocalCacheIsolationError } from '@/lib/storage/localCacheIsolationError';
import {
  getLocalDatabase,
  quarantineLocalDatabase,
  retryPendingLocalDatabaseIsolation,
} from '@/lib/storage/localDatabase';

export type LocalCachePreparation = 'kept' | 'discarded' | 'quarantined';

/**
 * Decide si la caché local sobrevive al inicio de una sesión.
 *
 * La caché es el cuaderno de trabajo sin conexión: quien no tiene Internet
 * sigue registrando movimientos en ella y estos suben en la siguiente
 * sincronización, así que la caché de quien entra se conserva.
 *
 * Solo se muestra o se sube con evidencia de que es de esta cuenta
 * (`classifyLocalCacheOwnership`). La de otra cuenta se borra; la de
 * propietario desconocido se aparta a un archivo aislado, sin borrarla. Si
 * cualquiera de las dos limpiezas falla, se propaga `LocalCacheIsolationError`
 * y la caché queda bloqueada hasta reintentar (`PROJECT_RULES.md` §15).
 */
export async function prepareLocalCacheForSession(): Promise<LocalCachePreparation> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    // Sin identidad no se puede atribuir la caché: ni se muestra ni se borra.
    throw new LocalCacheIsolationError('no_session');
  }

  // Una limpieza que falló en un intento anterior se repite tal cual antes de
  // volver a abrir la base; mientras no termine, nadie la recibe.
  const retried = await retryPendingLocalDatabaseIsolation(userId);

  const database = await getLocalDatabase();
  const ownership = await classifyLocalCacheOwnership(database, userId);
  // Un catálogo apartado por un borrado que no llegó a hacerse vuelve con su
  // base si esta es de quien entra; en cualquier otro caso se va con ella.
  await settlePendingDiscardCatalogue(ownership === 'current');
  if (ownership === 'current' || ownership === 'empty') {
    await claimLocalCacheOwnership(database, userId);
    // Una limpieza pendiente que terminó ahora deja una base vacía, pero lo
    // que la interfaz leyó antes era de la caché anterior: se informa como
    // tal para que lo relea en vez de enseñarlo.
    if (retried === 'discard') return 'discarded';
    if (retried === 'quarantine') return 'quarantined';
    return 'kept';
  }

  if (ownership === 'other_account') {
    await discardBackedLocalSessionCache({ forUserId: userId });
  } else {
    // El catálogo de espacios forma parte de la misma caché: se aparta antes
    // que la base para que un fallo a medias nunca deje el catálogo ajeno
    // junto a una base ya limpia.
    await quarantineSpacesCatalogue();
    await quarantineLocalDatabase({ forUserId: userId });
  }
  // La base anterior ya no está: el marcador se escribe sobre la nueva.
  await claimLocalCacheOwnership(await getLocalDatabase(), userId);
  return ownership === 'other_account' ? 'discarded' : 'quarantined';
}

async function quarantineSpacesCatalogue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(localSpaceStorage.key);
    if (stored === null) return;
    await AsyncStorage.setItem(
      `${localSpaceStorage.key}.unattributed.${Date.now()}`,
      stored,
    );
    await AsyncStorage.removeItem(localSpaceStorage.key);
  } catch (error) {
    throw new LocalCacheIsolationError('quarantine_failed', { cause: error });
  }
}

async function settlePendingDiscardCatalogue(restore: boolean): Promise<void> {
  try {
    const stashed = await AsyncStorage.getItem(pendingDiscardCatalogueKey);
    if (stashed === null) return;
    if (restore) await AsyncStorage.setItem(localSpaceStorage.key, stashed);
    await AsyncStorage.removeItem(pendingDiscardCatalogueKey);
  } catch (error) {
    // Sin catálogo, la caché se ve con el espacio personal hasta que la
    // restauración traiga el resto; nada de esto bloquea la sesión.
    console.error('[session] No se pudo devolver el catálogo apartado:', error);
  }
}
