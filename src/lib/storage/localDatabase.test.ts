import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getLocalDatabase,
  localDatabaseName,
  localDatabaseVersion,
  migrateLocalDatabase,
  resetLocalDatabase,
} from '@/lib/storage/localDatabase';

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

describe('migrateLocalDatabase', () => {
  it('crea un esquema versionado con integridad por espacio', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 0 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    expect(database.execAsync).toHaveBeenNthCalledWith(
      1,
      'PRAGMA foreign_keys = ON',
    );
    expect(database.execAsync).toHaveBeenNthCalledWith(
      2,
      'PRAGMA journal_mode = WAL',
    );
    const schema = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS categories');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS transactions');
    expect(schema).toContain('FOREIGN KEY (category_id, space_id)');
    expect(schema).toContain('CREATE TABLE recurring_transaction_series');
    expect(schema).toContain("'monthly', 'custom'");
    expect(schema).toContain('UNIQUE (recurrence_series_id, occurred_on)');
    expect(schema).toContain('ADD COLUMN recurrence_group_id TEXT');
    expect(schema).toContain('transactions_recurrence_group_idx');
    expect(schema).toContain("'legacy-series-' || id");
    expect(schema).toContain("WHEN 'restaurants' THEN 'coral'");
    expect(schema).toContain("WHEN 'other' THEN 'steel'");
    expect(schema).toContain("sync_status TEXT NOT NULL DEFAULT 'local_only'");
    expect(schema).toContain('CREATE TABLE local_sync_account');
    expect(schema).toContain('CREATE TABLE local_sync_batches');
    expect(transaction.execAsync).toHaveBeenLastCalledWith(
      `PRAGMA user_version = ${localDatabaseVersion}`,
    );
  });

  it('añade el control de cuenta y lotes al actualizar desde la versión 4', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 4 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE local_sync_account');
    expect(migration).toContain('CREATE TABLE local_sync_batches');
    expect(migration).not.toContain('ADD COLUMN recurrence_group_id');
  });

  it('añade la tabla de recordatorios de movimiento al actualizar desde la versión 5', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 5 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE transaction_reminders');
    expect(migration).toContain('UNIQUE (transaction_id)');
    expect(migration).toContain(
      'FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE',
    );
    expect(migration).not.toContain('CREATE TABLE local_sync_account');
  });

  it('añade las tablas de reglas de notificación al actualizar desde la versión 6', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 6 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE transaction_notification_rules');
    expect(migration).toContain('UNIQUE (space_id, transaction_type)');
    expect(migration).toContain(
      'CREATE TABLE transaction_notification_rule_schedules',
    );
    expect(migration).toContain(
      'FOREIGN KEY (rule_id) REFERENCES transaction_notification_rules(id) ON DELETE CASCADE',
    );
    expect(migration).not.toContain('CREATE TABLE transaction_reminders');
  });

  it('actualiza solo los colores anteriores de las plantillas repetidas', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 3 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain(
      "template_key = 'restaurants' AND color_token = 'orange'",
    );
    expect(migration).toContain(
      "template_key = 'other' AND color_token = 'slate'",
    );
    expect(migration).toContain('WHERE is_default = 1');
    expect(migration).not.toContain('CREATE TABLE IF NOT EXISTS categories');
  });

  it('añade la columna de nota a categorías y movimientos al actualizar desde la versión 7', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 7 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('ALTER TABLE categories ADD COLUMN note TEXT');
    expect(migration).toContain(
      'ALTER TABLE transactions ADD COLUMN note TEXT',
    );
    expect(migration).not.toContain(
      'CREATE TABLE transaction_notification_rules',
    );
  });

  it('añade la tabla de perfil local al actualizar desde la versión 8', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 8 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE local_profile');
    expect(migration).toContain('CHECK (singleton_id = 1)');
    expect(migration).not.toContain('ADD COLUMN note TEXT');
  });

  it('añade reglas personales de importación al actualizar desde la versión 10', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 10 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE import_merchant_rules');
    expect(migration).toContain('UNIQUE (space_id, normalized_merchant)');
    expect(migration).toContain('FOREIGN KEY (category_id, space_id)');
  });

  it('añade batches e ítems de importación al actualizar desde la versión 11', async () => {
    const transaction = {
      execAsync: jest.fn(async () => undefined),
    };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 11 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE import_batches');
    expect(migration).toContain('CREATE TABLE import_items');
    expect(migration).toContain('CHECK (json_valid(issues))');
    expect(migration).toContain('FOREIGN KEY (final_category_id, space_id)');
  });

  it('añade enlaces remotos explícitos al actualizar desde la versión 12', async () => {
    const transaction = { execAsync: jest.fn(async () => undefined) };
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 12 })),
      withExclusiveTransactionAsync: jest.fn(async (task) => task(transaction)),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    const migration = (transaction.execAsync as jest.Mock).mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(migration).toContain('CREATE TABLE remote_entity_links');
    expect(migration).toContain("'space', 'category', 'transaction'");
  });

  it('rechaza una base creada por una versión futura de la app', async () => {
    const database = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion + 1,
      })),
    } as unknown as SQLiteDatabase;

    await expect(migrateLocalDatabase(database)).rejects.toThrow(
      'La base local pertenece a una versión más reciente',
    );
  });

  it('repara local_profile.display_name si el dispositivo quedó en la versión actual sin esa columna', async () => {
    const execAsync = jest.fn(async () => undefined);
    const database = {
      execAsync,
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion,
      })),
      getAllAsync: jest.fn(async () => [
        { name: 'singleton_id' },
        { name: 'avatar_path' },
        { name: 'avatar_updated_at' },
      ]),
      withExclusiveTransactionAsync: jest.fn(),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    expect(database.getAllAsync).toHaveBeenCalledWith(
      'PRAGMA table_info(local_profile)',
    );
    expect(execAsync).toHaveBeenCalledWith(
      'ALTER TABLE local_profile ADD COLUMN display_name TEXT',
    );
    expect(database.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });

  it('no repite el ALTER si local_profile.display_name ya existe en la versión actual', async () => {
    const execAsync = jest.fn(async () => undefined);
    const database = {
      execAsync,
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion,
      })),
      getAllAsync: jest.fn(async () => [
        { name: 'singleton_id' },
        { name: 'avatar_path' },
        { name: 'avatar_updated_at' },
        { name: 'display_name' },
      ]),
      withExclusiveTransactionAsync: jest.fn(),
    } as unknown as SQLiteDatabase;

    await migrateLocalDatabase(database);

    expect(execAsync).not.toHaveBeenCalledWith(
      'ALTER TABLE local_profile ADD COLUMN display_name TEXT',
    );
  });
});

describe('getLocalDatabase', () => {
  const openDatabaseAsync = SQLite.openDatabaseAsync as jest.Mock;

  beforeEach(async () => {
    // Descarta la conexión en caché que pudo dejar un test anterior: cada
    // test de este bloque debe partir de `databasePromise` en null para que
    // `getLocalDatabase()` vuelva a llamar a `openDatabaseAsync`.
    await resetLocalDatabase();
    openDatabaseAsync.mockReset();
    (SQLite.deleteDatabaseAsync as jest.Mock).mockReset();
  });

  it('reintenta abrir la base tras un fallo en vez de quedar rota para toda la sesión', async () => {
    openDatabaseAsync.mockRejectedValueOnce(new Error('fallo transitorio'));

    await expect(getLocalDatabase()).rejects.toThrow('fallo transitorio');

    const workingDatabase = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion,
      })),
      getAllAsync: jest.fn(async () => [{ name: 'display_name' }]),
      withExclusiveTransactionAsync: jest.fn(async (task) =>
        task({ execAsync: jest.fn(async () => undefined) }),
      ),
    } as unknown as SQLiteDatabase;
    openDatabaseAsync.mockResolvedValueOnce(workingDatabase);

    await expect(getLocalDatabase()).resolves.toBe(workingDatabase);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('si la migración falla, borra la base y reintenta una vez con un archivo nuevo', async () => {
    const deleteDatabaseAsync = SQLite.deleteDatabaseAsync as jest.Mock;
    deleteDatabaseAsync.mockReset();
    deleteDatabaseAsync.mockResolvedValueOnce(undefined);

    const brokenDatabase = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion + 1,
      })),
    } as unknown as SQLiteDatabase;
    const freshDatabase = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({ user_version: 0 })),
      withExclusiveTransactionAsync: jest.fn(async (task) =>
        task({ execAsync: jest.fn(async () => undefined) }),
      ),
    } as unknown as SQLiteDatabase;
    openDatabaseAsync
      .mockResolvedValueOnce(brokenDatabase)
      .mockResolvedValueOnce(freshDatabase);

    await expect(getLocalDatabase()).resolves.toBe(freshDatabase);
    expect(deleteDatabaseAsync).toHaveBeenCalledWith(localDatabaseName);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });
});

describe('resetLocalDatabase', () => {
  const openDatabaseAsync = SQLite.openDatabaseAsync as jest.Mock;
  const deleteDatabaseAsync = SQLite.deleteDatabaseAsync as jest.Mock;

  beforeEach(async () => {
    openDatabaseAsync.mockReset();
    deleteDatabaseAsync.mockReset();
    // Un test anterior puede haber dejado una conexión en caché: se
    // descarta explícitamente para que cada test de este bloque parta de
    // `databasePromise` en null.
    await resetLocalDatabase();
    deleteDatabaseAsync.mockReset();
  });

  it('borra el archivo de la base y descarta la conexión en caché', async () => {
    const workingDatabase = {
      execAsync: jest.fn(async () => undefined),
      getFirstAsync: jest.fn(async () => ({
        user_version: localDatabaseVersion,
      })),
      getAllAsync: jest.fn(async () => [{ name: 'display_name' }]),
      withExclusiveTransactionAsync: jest.fn(async (task) =>
        task({ execAsync: jest.fn(async () => undefined) }),
      ),
    } as unknown as SQLiteDatabase;
    openDatabaseAsync.mockResolvedValue(workingDatabase);
    deleteDatabaseAsync.mockResolvedValueOnce(undefined);

    await getLocalDatabase();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);

    await resetLocalDatabase();
    expect(deleteDatabaseAsync).toHaveBeenCalledWith(localDatabaseName);

    await getLocalDatabase();
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('no propaga el error si el archivo ya no existe', async () => {
    deleteDatabaseAsync.mockRejectedValueOnce(new Error('no such file'));

    await expect(resetLocalDatabase()).resolves.toBeUndefined();
  });
});
