import AsyncStorage from '@react-native-async-storage/async-storage';

import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import { resetLocalDatabase } from '@/lib/storage/localDatabase';
import { clearDemoSession } from '@/state/demoSession/demoSessionStore';

/**
 * Al cerrar sesión, descarta la base de datos SQLite local y el catálogo de
 * espacios para que la app quede completamente limpia y no filtre datos
 * de la cuenta previa. Un usuario demo vive solo en esa caché, así que se
 * cierra con ella.
 */
export async function discardBackedLocalSessionCache(): Promise<boolean> {
  await resetLocalDatabase();
  await AsyncStorage.removeItem(localSpaceStorage.key);
  await clearDemoSession();
  return true;
}
