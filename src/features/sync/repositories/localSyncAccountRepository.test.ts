import {
  assertLocalCacheOwnedBy,
  claimLocalCacheOwnership,
  classifyLocalCacheOwnership,
  hasLocalCacheLinksForAnotherAccount,
  markLocalCacheAsOnboardingDraft,
  readLocalCacheOwner,
} from '@/features/sync/repositories/localSyncAccountRepository';
import { migrateLocalDatabase } from '@/lib/storage/localDatabaseMigrations';
import type { LocalSqlExecutor } from '@/lib/storage/localSqlExecutor';
import { createNodeSqliteDatabase } from '@/test/nodeSqliteDatabase';

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

describe('classifyLocalCacheOwnership', () => {
  let database: ReturnType<typeof createNodeSqliteDatabase>;

  beforeEach(async () => {
    database = createNodeSqliteDatabase();
    await migrateLocalDatabase(database);
  });

  afterEach(() => database.close());

  const addLink = (userId: string) =>
    database.runAsync(
      `INSERT INTO remote_entity_links (
         user_id, entity_type, remote_id, local_id, created_at, updated_at
       ) VALUES (?, 'category', 'remote-1', 'cat-1', '2026-01-01', '2026-01-01')`,
      userId,
    );
  const addCategory = () =>
    database.runAsync(
      `INSERT INTO categories (
         id, space_id, name, icon, color_token, is_default, created_by,
         sync_status, is_archived, created_at, updated_at
       ) VALUES ('cat-1', 'personal', 'Casa', 'house', 'violet', 0, 'x',
                 'local_only', 0, '2026-01-01', '2026-01-01')`,
    );

  it('reconoce la caché que declara a esta cuenta', async () => {
    await claimLocalCacheOwnership(database, 'ana');
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'current',
    );
  });

  it('identifica la caché que declara otra cuenta', async () => {
    await claimLocalCacheOwnership(database, 'beto');
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'other_account',
    );
  });

  it('usa los enlaces remotos de otra cuenta cuando no hay propietario', async () => {
    await addLink('beto');
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'other_account',
    );
  });

  it('adopta una caché sin propietario ni datos', async () => {
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'empty',
    );
  });

  it('adopta una caché con datos cuyos enlaces son solo de esta cuenta', async () => {
    await addCategory();
    await addLink('ana');
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'current',
    );
  });

  it('no atribuye una caché con datos, sin propietario ni enlaces', async () => {
    await addCategory();
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'unattributed',
    );
  });

  it('atribuye a la primera sesión la caché marcada por el onboarding', async () => {
    await markLocalCacheAsOnboardingDraft(database);
    await addCategory();
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'current',
    );

    // Al reclamarla, la marca desaparece: no vuelve a servir de prueba.
    await claimLocalCacheOwnership(database, 'ana');
    await database.runAsync('DELETE FROM local_sync_account');
    await expect(classifyLocalCacheOwnership(database, 'beto')).resolves.toBe(
      'unattributed',
    );
  });

  it('no marca como onboarding una caché que ya tenía datos', async () => {
    await addCategory();
    await markLocalCacheAsOnboardingDraft(database);
    await expect(classifyLocalCacheOwnership(database, 'ana')).resolves.toBe(
      'unattributed',
    );
  });
});

describe('assertLocalCacheOwnedBy', () => {
  it('rechaza subir una caché sin propietario o de otra cuenta', async () => {
    await expect(
      assertLocalCacheOwnedBy(createExecutor(jest.fn(async () => null)), 'ana'),
    ).rejects.toMatchObject({ reason: 'owner_mismatch' });
    await expect(
      assertLocalCacheOwnedBy(
        createExecutor(jest.fn(async () => ({ user_id: 'beto' }))),
        'ana',
      ),
    ).rejects.toMatchObject({ reason: 'owner_mismatch' });
    await expect(
      assertLocalCacheOwnedBy(
        createExecutor(jest.fn(async () => ({ user_id: 'ana' }))),
        'ana',
      ),
    ).resolves.toBeUndefined();
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
