import type { SQLiteDatabase } from 'expo-sqlite';

import {
  localDatabaseVersion,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabase';

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
    expect(migration).not.toContain('ALTER TABLE transactions ADD COLUMN');
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
});
