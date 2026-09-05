import {
  claimLocalCacheOwnership,
  hasLocalCacheLinksForAnotherAccount,
  localCacheBelongsToAnotherAccount,
  readLocalCacheOwner,
} from '@/features/sync/repositories/localSyncAccountRepository';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

function createExecutor(
  getFirstAsync: jest.Mock,
): LocalSqlExecutor & { runAsync: jest.Mock } {
  return {
    getFirstAsync,
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
  } as unknown as LocalSqlExecutor & { runAsync: jest.Mock };
}

describe('readLocalCacheOwner', () => {
  it('devuelve la cuenta declarada como propietaria', async () => {
    const executor = createExecutor(jest.fn(async () => ({ user_id: 'ana' })));

    await expect(readLocalCacheOwner(executor)).resolves.toBe('ana');
  });

  it('devuelve null cuando la caché no declara propietario', async () => {
    const executor = createExecutor(jest.fn(async () => null));

    await expect(readLocalCacheOwner(executor)).resolves.toBeNull();
  });
});

describe('hasLocalCacheLinksForAnotherAccount', () => {
  it('detecta enlaces remotos de otra cuenta', async () => {
    const getFirstAsync = jest.fn(async () => ({ user_id: 'beto' }));
    const executor = createExecutor(getFirstAsync);

    await expect(
      hasLocalCacheLinksForAnotherAccount(executor, 'ana'),
    ).resolves.toBe(true);
    expect(getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id <> ?'),
      'ana',
    );
  });

  it('no ve rastro de otra cuenta cuando no hay enlaces ajenos', async () => {
    const executor = createExecutor(jest.fn(async () => null));

    await expect(
      hasLocalCacheLinksForAnotherAccount(executor, 'ana'),
    ).resolves.toBe(false);
  });
});

describe('localCacheBelongsToAnotherAccount', () => {
  it('reconoce como propia la caché que declara a esta cuenta', async () => {
    const executor = createExecutor(jest.fn(async () => ({ user_id: 'ana' })));

    await expect(
      localCacheBelongsToAnotherAccount(executor, 'ana'),
    ).resolves.toBe(false);
  });

  it('descarta la caché que declara otra cuenta', async () => {
    const executor = createExecutor(jest.fn(async () => ({ user_id: 'beto' })));

    await expect(
      localCacheBelongsToAnotherAccount(executor, 'ana'),
    ).resolves.toBe(true);
  });

  it('usa los enlaces remotos cuando no hay propietario declarado', async () => {
    // Dispositivo anterior al marcador: los enlaces son la única prueba.
    const executor = createExecutor(
      jest.fn(async (statement: string) =>
        statement.includes('remote_entity_links') ? { user_id: 'beto' } : null,
      ),
    );

    await expect(
      localCacheBelongsToAnotherAccount(executor, 'ana'),
    ).resolves.toBe(true);
  });

  it('conserva una caché sin propietario ni enlaces', async () => {
    // Puede ser trabajo sin conexión creado antes de completar una
    // restauración: nada prueba que sea de otra cuenta y borrarlo lo perdería.
    const executor = createExecutor(jest.fn(async () => null));

    await expect(
      localCacheBelongsToAnotherAccount(executor, 'ana'),
    ).resolves.toBe(false);
  });
});

describe('claimLocalCacheOwnership', () => {
  it('escribe el propietario como fila única', async () => {
    const executor = createExecutor(jest.fn(async () => null));

    await claimLocalCacheOwnership(executor, 'ana');

    const [statement, userId] = executor.runAsync.mock.calls[0];
    expect(statement).toContain('INSERT INTO local_sync_account');
    expect(statement).toContain('ON CONFLICT (singleton_id) DO UPDATE SET');
    expect(userId).toBe('ana');
  });

  it('rechaza una sesión sin identidad', async () => {
    const executor = createExecutor(jest.fn(async () => null));

    await expect(claimLocalCacheOwnership(executor, '')).rejects.toThrow(
      'La sesión autenticada no es válida',
    );
    expect(executor.runAsync).not.toHaveBeenCalled();
  });
});
