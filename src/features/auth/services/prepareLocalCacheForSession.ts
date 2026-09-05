import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  claimLocalCacheOwnership,
  localCacheBelongsToAnotherAccount,
} from '@/features/sync/repositories/localSyncAccountRepository';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

export type LocalCachePreparation = 'kept' | 'discarded';

/**
 * Decide si la caché local sobrevive al inicio de una sesión.
 *
 * La caché es el cuaderno de trabajo sin conexión: quien no tiene Internet
 * sigue registrando movimientos en ella y estos suben en la siguiente
 * sincronización. Descartarla en cada inicio de sesión —lo que se hacía hasta
 * ahora— borraba ese trabajo antes de intentar subirlo, y cuando la
 * restauración remota fallaba (una sesión caducada, por ejemplo) no quedaba
 * nada que lo devolviera.
 *
 * `restoreRemoteAccount` ya está construido para convivir con esas filas: al
 * bajar el snapshot solo sobrescribe las que están en `synced`, de modo que lo
 * pendiente de subir se respeta. Vaciar la base antes hacía inútil esa guarda.
 *
 * Se descarta únicamente ante una prueba positiva de que la caché es de otra
 * cuenta, que es lo que exige `PROJECT_RULES.md` §15: ninguna fila heredada
 * puede sobrevivir a un cambio de cuenta.
 */
export async function prepareLocalCacheForSession(): Promise<LocalCachePreparation> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    // Sin identidad no se puede probar de quién es la caché, y mostrarla
    // significaría enseñar datos financieros sin una sesión que los autorice.
    await discardBackedLocalSessionCache();
    return 'discarded';
  }

  const database = await getLocalDatabase();
  if (await localCacheBelongsToAnotherAccount(database, userId)) {
    await discardBackedLocalSessionCache();
    // La base anterior se borró: el marcador se escribe sobre la nueva.
    await claimLocalCacheOwnership(await getLocalDatabase(), userId);
    return 'discarded';
  }

  await claimLocalCacheOwnership(database, userId);
  return 'kept';
}
