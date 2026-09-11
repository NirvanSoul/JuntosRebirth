import {
  loadRemoteEntityLinks,
  upsertRemoteEntityLink,
} from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';

function createExecutor(
  rows: readonly { remote_id: string; local_id: string }[],
) {
  return {
    getAllAsync: jest.fn(async () => rows),
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
  } as unknown as LocalSqlExecutor & {
    getAllAsync: jest.Mock;
    runAsync: jest.Mock;
  };
}

describe('localRemoteEntityLinkRepository', () => {
  it('carga en una sola lectura los enlaces de un tipo para la cuenta', async () => {
    const executor = createExecutor([
      { remote_id: 'remote-a', local_id: 'local-a' },
      { remote_id: 'remote-b', local_id: 'local-b' },
    ]);

    const links = await loadRemoteEntityLinks({
      executor,
      userId: 'user-1',
      entityType: 'transaction',
    });

    expect(links).toEqual(
      new Map([
        ['remote-a', 'local-a'],
        ['remote-b', 'local-b'],
      ]),
    );
    expect(executor.getAllAsync).toHaveBeenCalledTimes(1);
    expect(executor.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ? AND entity_type = ?'),
      'user-1',
      'transaction',
    );
  });

  it('escribe el enlace con el id local indicado y no lo relee', async () => {
    const executor = createExecutor([]);

    await upsertRemoteEntityLink({
      executor,
      userId: 'user-1',
      entityType: 'category',
      remoteId: 'remote-a',
      localId: 'local-a',
    });

    expect(executor.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO remote_entity_links'),
      'user-1',
      'category',
      'remote-a',
      'local-a',
      expect.any(String),
      expect.any(String),
    );
    expect(executor.getFirstAsync).not.toHaveBeenCalled();
    expect(executor.getAllAsync).not.toHaveBeenCalled();
  });

  it('rechaza un enlace sin cuenta o sin id remoto', async () => {
    const executor = createExecutor([]);

    await expect(
      upsertRemoteEntityLink({
        executor,
        userId: '',
        entityType: 'category',
        remoteId: 'remote-a',
        localId: 'local-a',
      }),
    ).rejects.toThrow('El enlace remoto no es válido');
    expect(executor.runAsync).not.toHaveBeenCalled();
  });
});
