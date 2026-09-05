import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  claimLocalCacheOwnership,
  localCacheBelongsToAnotherAccount,
} from '@/features/sync/repositories/localSyncAccountRepository';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

jest.mock('@/features/auth/services/discardBackedLocalSessionCache');
jest.mock('@/features/legal/services/authenticatedUser');
jest.mock('@/features/sync/repositories/localSyncAccountRepository');
jest.mock('@/lib/storage/localDatabase');

const database = { id: 'database' };

describe('prepareLocalCacheForSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue('ana');
    (getLocalDatabase as jest.Mock).mockResolvedValue(database);
    (claimLocalCacheOwnership as jest.Mock).mockResolvedValue(undefined);
    (discardBackedLocalSessionCache as jest.Mock).mockResolvedValue(true);
  });

  it('conserva la caché de la propia cuenta para no perder el trabajo sin conexión', async () => {
    (localCacheBelongsToAnotherAccount as jest.Mock).mockResolvedValue(false);

    await expect(prepareLocalCacheForSession()).resolves.toBe('kept');

    expect(discardBackedLocalSessionCache).not.toHaveBeenCalled();
    expect(claimLocalCacheOwnership).toHaveBeenCalledWith(database, 'ana');
  });

  it('descarta la caché heredada de otra cuenta antes de restaurar', async () => {
    (localCacheBelongsToAnotherAccount as jest.Mock).mockResolvedValue(true);

    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');

    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
    // El marcador se escribe sobre la base nueva, no sobre la que se borró.
    expect(getLocalDatabase).toHaveBeenCalledTimes(2);
    expect(claimLocalCacheOwnership).toHaveBeenCalledWith(database, 'ana');
  });

  it('descarta la caché si la sesión no tiene identidad', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');

    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
    expect(claimLocalCacheOwnership).not.toHaveBeenCalled();
    // Sin identidad no se abre siquiera la base: no hay nada que comprobar.
    expect(localCacheBelongsToAnotherAccount).not.toHaveBeenCalled();
  });
});
