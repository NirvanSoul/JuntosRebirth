import AsyncStorage from '@react-native-async-storage/async-storage';

import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import { resetLocalDatabase } from '@/lib/storage/localDatabase';

/**
 * Al cerrar sesión, descarta la base de datos SQLite local y el catálogo de
 * espacios para que la app quede completamente limpia y no filtre datos
 * de la cuenta previa.
 */
export async function discardBackedLocalSessionCache(): Promise<boolean> {
  await resetLocalDatabase();
  await AsyncStorage.removeItem(localSpaceStorage.key);
  return true;
}
