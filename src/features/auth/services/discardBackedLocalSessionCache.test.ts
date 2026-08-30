import AsyncStorage from '@react-native-async-storage/async-storage';

import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import { resetLocalDatabase } from '@/lib/storage/localDatabase';

jest.mock('@/lib/storage/localDatabase');

describe('discardBackedLocalSessionCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resetLocalDatabase).mockResolvedValue();
  });

  it('borra la base de datos local y el catálogo de espacios al cerrar sesión', async () => {
    await expect(discardBackedLocalSessionCache()).resolves.toBe(true);

    expect(resetLocalDatabase).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(localSpaceStorage.key);
  });
});
