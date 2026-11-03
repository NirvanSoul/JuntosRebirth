import AsyncStorage from '@react-native-async-storage/async-storage';

import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import { prepareLocalCacheForSession } from '@/features/auth/services/prepareLocalCacheForSession';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { localSpaceStorage } from '@/features/spaces/repositories/localSpaceRepository';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import {
  claimLocalCacheOwnership,
  markLocalCacheAsOnboardingDraft,
  readLocalCacheOwner,
} from '@/features/sync/repositories/localSyncAccountRepository';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';
import { isLocalCacheIsolationError } from '@/lib/storage/localCacheIsolationError';
import {
  getLocalDatabase,
  resetLocalDatabase,
  retryPendingLocalDatabaseIsolation,
} from '@/lib/storage/localDatabase';
import {
  createNodeFiles,
  createNodeSqliteDatabase,
} from '@/test/nodeSqliteDatabase';

const files = createNodeFiles();

/**
 * Sistema de archivos de SQLite simulado sobre archivos reales: `expo-sqlite`
 * se sustituye por `node:sqlite`, de modo que borrar, copiar y reabrir la
 * caché ocurren de verdad y solo los fallos se inyectan.
 */
const mockFs = {
  directory: '',
  open: new Map<string, ReturnType<typeof createNodeSqliteDatabase>>(),
  failDelete: false,
  failBackup: false,
};

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));
jest.mock('expo-sqlite', () => {
  const { createNodeFiles: createFiles, createNodeSqliteDatabase: create } =
    jest.requireActual<typeof import('@/test/nodeSqliteDatabase')>(
      '@/test/nodeSqliteDatabase',
    );
  const nodeFiles = createFiles();
  const fileOf = (name: string) => nodeFiles.join(mockFs.directory, name);
  return {
    openDatabaseAsync: jest.fn(async (name: string) => {
      const database = create(fileOf(name));
      const close = database.closeAsync;
      database.closeAsync = async () => {
        mockFs.open.delete(name);
        await close();
      };
      mockFs.open.set(name, database);
      return database;
    }),
    deleteDatabaseAsync: jest.fn(async (name: string) => {
      if (mockFs.failDelete) throw new Error('Unable to delete the database');
      if (mockFs.open.has(name)) {
        throw new Error(`Unable to delete database ${name} that is open`);
      }
      if (!nodeFiles.exists(fileOf(name))) {
        throw new Error(`Database ${name} not found`);
      }
      for (const suffix of ['', '-wal', '-shm']) {
        nodeFiles.remove(fileOf(name) + suffix);
      }
    }),
    backupDatabaseAsync: jest.fn(
      async (input: {
        sourceDatabase: { native: unknown };
        destDatabase: { databasePath: string };
      }) => {
        if (mockFs.failBackup) throw new Error('backup failed');
        const { backup } = jest.requireActual<{
          backup: (source: unknown, destination: string) => Promise<void>;
        }>('node:sqlite');
        await backup(
          input.sourceDatabase.native,
          input.destDatabase.databasePath,
        );
      },
    ),
  };
});
jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(),
}));
jest.mock('@/features/sync/gateways/juntossCoupleSpaceSyncGateway', () => ({
  syncCoupleSpaceRemotely: jest.fn(async () => ({
    categoryCount: 0,
    moneyAccountCount: 0,
    recurringSeriesCount: 0,
    transactionCount: 0,
  })),
}));

const signInAs = (userId: string | null) =>
  (getAuthenticatedUserId as jest.Mock).mockResolvedValue(userId);

async function seedAccountData(owner: string | null) {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO categories (
       id, space_id, name, icon, color_token, is_default, created_by,
       sync_status, is_archived, created_at, updated_at
     ) VALUES ('cat-a', 'personal', 'Secreto de A', 'fork-knife', 'violet', 0,
               'user-a', 'pending', 0, '2026-01-01', '2026-01-01')`,
  );
  if (owner) await claimLocalCacheOwnership(database, owner);
  await AsyncStorage.setItem(localSpaceStorage.key, '{"spaces":["de A"]}');
}

async function readOnDisk<T>(source: string): Promise<T | null> {
  const database = createNodeSqliteDatabase(
    files.join(mockFs.directory, 'juntoss.db'),
  );
  try {
    return (await database.getFirstAsync<T>(source)) ?? null;
  } finally {
    database.close();
  }
}

/** Cierra la conexión en caché para poder inspeccionar el archivo. */
async function closeCachedConnection() {
  for (const database of mockFs.open.values()) await database.closeAsync();
}

describe('aislamiento de la caché entre cuentas', () => {
  beforeEach(async () => {
    mockFs.directory = files.createTemporaryDirectory();
    mockFs.failDelete = false;
    mockFs.failBackup = false;
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    // Deja el módulo sin conexión ni limpieza pendiente para la prueba
    // siguiente.
    mockFs.failDelete = false;
    mockFs.failBackup = false;
    await retryPendingLocalDatabaseIsolation().catch(() => undefined);
    await resetLocalDatabase().catch(() => undefined);
    files.remove(mockFs.directory);
  });

  it('si no puede borrar la caché de A, B no la ve, no la sube y A sigue siendo su propietario', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');

    mockFs.failDelete = true;
    signInAs('user-b');
    const failure = await prepareLocalCacheForSession().catch((e) => e);

    expect(isLocalCacheIsolationError(failure)).toBe(true);
    // Nadie recibe la base mientras siga sin aislar: ni la UI ni la subida.
    await expect(getLocalDatabase()).rejects.toMatchObject({
      reason: 'discard_failed',
    });
    await expect(
      syncSpaceDataForCurrentSession({ spaceId: 'personal' }),
    ).rejects.toMatchObject({ reason: 'discard_failed' });
    expect(syncCoupleSpaceRemotely).not.toHaveBeenCalled();

    await closeCachedConnection();
    await expect(
      readOnDisk<{ user_id: string }>('SELECT user_id FROM local_sync_account'),
    ).resolves.toEqual({ user_id: 'user-a' });
    // El catálogo de espacios de A tampoco queda a la vista de B.
    expect(await AsyncStorage.getItem(localSpaceStorage.key)).toBeNull();

    // Reintento satisfactorio: se repite el borrado pendiente y B empieza
    // con una caché vacía, ya suya. Se informa como descartada para que la
    // interfaz relea lo que leyó de la caché de A.
    mockFs.failDelete = false;
    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');
    const database = await getLocalDatabase();
    expect(await readLocalCacheOwner(database)).toBe('user-b');
    await expect(
      database.getFirstAsync('SELECT id FROM categories'),
    ).resolves.toBeNull();
  });

  it('aparta sin borrar una caché heredada sin propietario y no la sube', async () => {
    signInAs('user-b');
    await getLocalDatabase();
    await seedAccountData(null);

    await expect(prepareLocalCacheForSession()).resolves.toBe('quarantined');

    const database = await getLocalDatabase();
    expect(await readLocalCacheOwner(database)).toBe('user-b');
    await expect(
      database.getFirstAsync('SELECT id FROM categories'),
    ).resolves.toBeNull();
    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });
    expect(syncCoupleSpaceRemotely).not.toHaveBeenCalled();

    // Los datos siguen en el dispositivo, en su archivo aislado.
    const [quarantined] = files
      .list(mockFs.directory)
      .filter((name) => name.startsWith('juntoss-unattributed-'));
    const copy = createNodeSqliteDatabase(
      files.join(mockFs.directory, quarantined!),
    );
    await expect(
      copy.getFirstAsync('SELECT name FROM categories'),
    ).resolves.toEqual({ name: 'Secreto de A' });
    copy.close();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((key) => key.includes('.unattributed.'))).toBe(true);
    expect(await AsyncStorage.getItem(localSpaceStorage.key)).toBeNull();
  });

  it('si no puede apartar la caché sin propietario, la bloquea sin borrarla', async () => {
    signInAs('user-b');
    await getLocalDatabase();
    await seedAccountData(null);
    mockFs.failBackup = true;

    await expect(prepareLocalCacheForSession()).rejects.toMatchObject({
      reason: 'quarantine_failed',
    });
    await expect(getLocalDatabase()).rejects.toMatchObject({
      reason: 'quarantine_failed',
    });

    await closeCachedConnection();
    await expect(
      readOnDisk<{ name: string }>('SELECT name FROM categories'),
    ).resolves.toEqual({ name: 'Secreto de A' });

    mockFs.failBackup = false;
    await expect(prepareLocalCacheForSession()).resolves.toBe('quarantined');
    expect(await readLocalCacheOwner(await getLocalDatabase())).toBe('user-b');
  });

  it('si B sale del bloqueo y vuelve A, su caché no se borra con la decisión de B', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');
    const catalogueOfA = JSON.stringify({
      spaces: [{ id: 'juntos-de-a', name: 'Casa', type: 'couple' }],
      activeSpaceId: 'juntos-de-a',
    });
    await AsyncStorage.setItem(localSpaceStorage.key, catalogueOfA);

    mockFs.failDelete = true;
    signInAs('user-b');
    await expect(prepareLocalCacheForSession()).rejects.toMatchObject({
      reason: 'discard_failed',
    });
    // B no ve los espacios de A mientras dura el bloqueo.
    expect(await AsyncStorage.getItem(localSpaceStorage.key)).toBeNull();

    // B cierra sesión desde el bloqueo sin borrar nada; entra A, la dueña.
    mockFs.failDelete = false;
    signInAs('user-a');
    await expect(prepareLocalCacheForSession()).resolves.toBe('kept');

    const database = await getLocalDatabase();
    expect(await readLocalCacheOwner(database)).toBe('user-a');
    await expect(
      database.getFirstAsync<{ name: string }>('SELECT name FROM categories'),
    ).resolves.toEqual({ name: 'Secreto de A' });
    // Y recupera sus espacios con ella.
    expect(await AsyncStorage.getItem(localSpaceStorage.key)).toBe(
      catalogueOfA,
    );
  });

  it('si el borrado pendiente termina, el catálogo apartado se va con la caché', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');
    await AsyncStorage.setItem(localSpaceStorage.key, '{"spaces":[]}');

    mockFs.failDelete = true;
    signInAs('user-b');
    await prepareLocalCacheForSession().catch(() => undefined);

    mockFs.failDelete = false;
    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');
    expect(await AsyncStorage.getItem(localSpaceStorage.key)).toBeNull();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((key) => key.includes('pendingDiscard'))).toBe(false);
  });

  it('el borrado que decidió quien cerró sesión se repite con cualquier cuenta', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');

    // A eligió cerrar sesión y borrar sus cambios, pero el borrado falló.
    mockFs.failDelete = true;
    await expect(discardBackedLocalSessionCache()).rejects.toMatchObject({
      reason: 'discard_failed',
    });

    mockFs.failDelete = false;
    signInAs('user-a');
    await expect(prepareLocalCacheForSession()).resolves.toBe('discarded');
    await expect(
      (await getLocalDatabase()).getFirstAsync('SELECT id FROM categories'),
    ).resolves.toBeNull();
  });

  it('asocia a la primera sesión lo creado durante el onboarding', async () => {
    await markLocalCacheAsOnboardingDraft(await getLocalDatabase());
    await seedAccountData(null);
    signInAs('user-a');

    await expect(prepareLocalCacheForSession()).resolves.toBe('kept');

    const database = await getLocalDatabase();
    await expect(
      database.getFirstAsync('SELECT name FROM categories'),
    ).resolves.toEqual({ name: 'Secreto de A' });
  });

  it('sin sesión no muestra ni borra la caché', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');
    signInAs(null);

    await expect(prepareLocalCacheForSession()).rejects.toMatchObject({
      reason: 'no_session',
    });

    const database = await getLocalDatabase();
    expect(await readLocalCacheOwner(database)).toBe('user-a');
  });

  it('la misma cuenta recupera su caché con cambios pendientes y los sube', async () => {
    signInAs('user-a');
    await prepareLocalCacheForSession();
    await seedAccountData('user-a');

    await expect(prepareLocalCacheForSession()).resolves.toBe('kept');
    await syncSpaceDataForCurrentSession({ spaceId: 'personal' });

    expect(syncCoupleSpaceRemotely).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: [expect.objectContaining({ name: 'Secreto de A' })],
      }),
    );
  });
});
