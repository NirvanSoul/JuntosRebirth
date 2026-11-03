import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
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
    (quarantineLocalDatabase as jest.Mock).mockResolvedValue('aislada.db');
    (retryPendingLocalDatabaseIsolation as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it.each(['current', 'empty'] as const)(
    'conserva y reclama una caché %s para no perder el trabajo sin conexión',
    async (ownership) => {
      (classifyLocalCacheOwnership as jest.Mock).mockResolvedValue(ownership);

      await expect(prepareLocalCacheForSession()).resolves.toBe('kept');

      expect(discardBackedLocalSessionCache).not.toHaveBeenCalled();
      expect(quarantineLocalDatabase).not.toHaveBeenCalled();
      expect(claimLocalCacheOwnership).toHaveBeenCalledWith(database, 'ana');
    },
  );

  it('descarta la caché de otra cuenta antes de restaurar', async () => {
    (classifyLocalCacheOwnership as jest.Mock).mockResolvedValue(
      'other_account',
    );

    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');

    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
    // El marcador se escribe sobre la base nueva, no sobre la que se borró.
    expect(getLocalDatabase).toHaveBeenCalledTimes(2);
    expect(claimLocalCacheOwnership).toHaveBeenCalledWith(database, 'ana');
  });

  it('aparta sin borrar una caché que no se puede atribuir', async () => {
    (classifyLocalCacheOwnership as jest.Mock).mockResolvedValue(
      'unattributed',
    );

    await expect(prepareLocalCacheForSession()).resolves.toBe('quarantined');

    expect(quarantineLocalDatabase).toHaveBeenCalledTimes(1);
    expect(discardBackedLocalSessionCache).not.toHaveBeenCalled();
  });

  it('no reclama la caché si el borrado de la de otra cuenta falla', async () => {
    (classifyLocalCacheOwnership as jest.Mock).mockResolvedValue(
      'other_account',
    );
    (discardBackedLocalSessionCache as jest.Mock).mockRejectedValue(
      new LocalCacheIsolationError('discard_failed'),
    );

    await expect(prepareLocalCacheForSession()).rejects.toMatchObject({
      reason: 'discard_failed',
    });
    expect(claimLocalCacheOwnership).not.toHaveBeenCalled();
  });

  it('repite una limpieza pendiente antes de abrir la base', async () => {
    (classifyLocalCacheOwnership as jest.Mock).mockResolvedValue('empty');
    const order: string[] = [];
    (retryPendingLocalDatabaseIsolation as jest.Mock).mockImplementation(
      async () => order.push('retry'),
    );
    (getLocalDatabase as jest.Mock).mockImplementation(async () => {
      order.push('open');
      return database;
    });

    await prepareLocalCacheForSession();

    expect(order.slice(0, 2)).toEqual(['retry', 'open']);
  });

  it('sin identidad no muestra, no reclama y no borra la caché', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

    await expect(prepareLocalCacheForSession()).rejects.toMatchObject({
      reason: 'no_session',
    });

    expect(discardBackedLocalSessionCache).not.toHaveBeenCalled();
    expect(quarantineLocalDatabase).not.toHaveBeenCalled();
    expect(claimLocalCacheOwnership).not.toHaveBeenCalled();
    expect(classifyLocalCacheOwnership).not.toHaveBeenCalled();
  });
});
