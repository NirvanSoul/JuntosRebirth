import AsyncStorage from '@react-native-async-storage/async-storage';

import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import { resetLocalDatabase } from '@/lib/storage/localDatabase';
import { clearDemoSession } from '@/state/demoSession/demoSessionStore';

/**
 * Donde se guarda el catálogo de espacios mientras el borrado de una caché
 * ajena sigue pendiente. Si al final entra su dueña, se le devuelve
 * (`prepareLocalCacheForSession`); si la caché se borra, se borra con ella.
 */
export const pendingDiscardCatalogueKey = `${localSpaceStorage.key}.pendingDiscard`;

/**
 * Al cerrar sesión, descarta la base de datos SQLite local y el catálogo de
 * espacios para que la app quede completamente limpia y no filtre datos
 * de la cuenta previa. Un usuario demo vive solo en esa caché, así que se
 * cierra con ella.
 *
 * Si la base no se puede borrar, el catálogo y la sesión demo se retiran
 * igualmente y el fallo se propaga: la base queda bloqueada
 * (`LocalCacheIsolationError`) hasta que un reintento la borre. Con
 * `forUserId`, el catálogo se aparta en `pendingDiscardCatalogueKey`.
 */
export async function discardBackedLocalSessionCache(options?: {
  /** La caché se borra porque no es de esta cuenta, que está entrando. */
  forUserId?: string;
}): Promise<boolean> {
  let databaseFailure: { error: unknown } | null = null;
  try {
    await resetLocalDatabase(options);
  } catch (error) {
    databaseFailure = { error };
  }
  // El catálogo sale de la vista en cualquier caso. Si la base no se pudo
  // borrar porque no era de quien entra, se aparta en vez de borrarse: podría
  // ser de quien vuelva a entrar, y la base sigue con sus datos.
  const catalogue = await AsyncStorage.getItem(localSpaceStorage.key);
  if (databaseFailure && options?.forUserId && catalogue !== null) {
    await AsyncStorage.setItem(pendingDiscardCatalogueKey, catalogue);
  }
  await AsyncStorage.removeItem(localSpaceStorage.key);
  await clearDemoSession();
  if (databaseFailure) throw databaseFailure.error;
  return true;
}
