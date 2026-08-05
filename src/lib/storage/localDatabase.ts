import * as SQLite from 'expo-sqlite';

export const localDatabaseName = 'juntoss.db';
export const localDatabaseVersion = 7;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function migrateLocalDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON');
  await database.execAsync('PRAGMA journal_mode = WAL');

  const versionRow = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > localDatabaseVersion) {
    throw new Error('La base local pertenece a una versión más reciente');
  }
  if (currentVersion === localDatabaseVersion) return;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (currentVersion < 1) {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS local_metadata (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color_token TEXT NOT NULL,
          budget_minor INTEGER,
          is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
          template_key TEXT,
          source_category_id TEXT,
          created_by TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          UNIQUE (id, space_id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          currency TEXT NOT NULL,
          title TEXT NOT NULL,
          occurred_on TEXT NOT NULL,
          recurrence TEXT NOT NULL
            CHECK (recurrence IN ('once', 'weekly', 'biweekly', 'monthly')),
          source_transaction_id TEXT,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (category_id, space_id)
            REFERENCES categories(id, space_id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS categories_space_active_idx
          ON categories(space_id, is_archived, name);
        CREATE INDEX IF NOT EXISTS categories_sync_idx
          ON categories(sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS transactions_space_date_idx
          ON transactions(space_id, is_archived, occurred_on DESC);
        CREATE INDEX IF NOT EXISTS transactions_category_date_idx
          ON transactions(category_id, is_archived, occurred_on DESC);
        CREATE INDEX IF NOT EXISTS transactions_sync_idx
          ON transactions(sync_status, updated_at);
      `);
    }

    if (currentVersion < 2) {
      await transaction.execAsync(`
        ALTER TABLE transactions RENAME TO transactions_v1;

        CREATE TABLE recurring_transaction_series (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          currency TEXT NOT NULL,
          title TEXT NOT NULL,
          frequency TEXT NOT NULL
            CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
          starts_on TEXT NOT NULL,
          generated_occurrences INTEGER NOT NULL DEFAULT 1
            CHECK (generated_occurrences >= 0),
          next_occurrence_on TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (category_id, space_id)
            REFERENCES categories(id, space_id) ON DELETE RESTRICT
        );

        CREATE TABLE transactions (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          currency TEXT NOT NULL,
          title TEXT NOT NULL,
          occurred_on TEXT NOT NULL,
          recurrence TEXT NOT NULL
            CHECK (recurrence IN ('once', 'weekly', 'biweekly', 'monthly', 'custom')),
          recurrence_series_id TEXT,
          source_transaction_id TEXT,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (category_id, space_id)
            REFERENCES categories(id, space_id) ON DELETE RESTRICT,
          FOREIGN KEY (recurrence_series_id)
            REFERENCES recurring_transaction_series(id) ON DELETE RESTRICT,
          UNIQUE (recurrence_series_id, occurred_on)
        );

        INSERT INTO transactions (
          id, space_id, category_id, created_by, type, amount_minor, currency,
          title, occurred_on, recurrence, recurrence_series_id,
          source_transaction_id, sync_status, is_archived, created_at,
          updated_at, archived_at
        )
        SELECT id, space_id, category_id, created_by, type, amount_minor,
               currency, title, occurred_on, recurrence, NULL,
               source_transaction_id, sync_status, is_archived, created_at,
               updated_at, archived_at
          FROM transactions_v1;

        INSERT INTO recurring_transaction_series (
          id, space_id, category_id, created_by, type, amount_minor, currency,
          title, frequency, starts_on, generated_occurrences,
          next_occurrence_on, sync_status, is_archived, created_at, updated_at,
          archived_at
        )
        SELECT 'legacy-series-' || id, space_id, category_id, created_by, type,
               amount_minor, currency, title, recurrence, occurred_on, 0,
               occurred_on, sync_status, is_archived, created_at, updated_at,
               archived_at
          FROM transactions_v1
         WHERE recurrence IN ('weekly', 'biweekly', 'monthly');

        UPDATE transactions
           SET recurrence_series_id = 'legacy-series-' || id
         WHERE recurrence IN ('weekly', 'biweekly', 'monthly');

        DROP TABLE transactions_v1;

        CREATE INDEX transactions_space_date_idx
          ON transactions(space_id, is_archived, occurred_on DESC);
        CREATE INDEX transactions_category_date_idx
          ON transactions(category_id, is_archived, occurred_on DESC);
        CREATE INDEX transactions_sync_idx
          ON transactions(sync_status, updated_at);
        CREATE INDEX recurring_series_due_idx
          ON recurring_transaction_series(is_archived, next_occurrence_on);
      `);
    }

    if (currentVersion < 3) {
      await transaction.execAsync(`
        ALTER TABLE transactions ADD COLUMN recurrence_group_id TEXT;

        UPDATE transactions
           SET recurrence_group_id =
             'legacy-custom-' || space_id || '-' || category_id || '-' ||
             amount_minor || '-' || created_at
         WHERE recurrence = 'custom';

        CREATE INDEX transactions_recurrence_group_idx
          ON transactions(recurrence_group_id, occurred_on DESC);
      `);
    }

    if (currentVersion < 4) {
      await transaction.execAsync(`
        UPDATE categories
           SET color_token = CASE template_key
                 WHEN 'restaurants' THEN 'coral'
                 WHEN 'family' THEN 'green'
                 WHEN 'leisure' THEN 'plum'
                 WHEN 'subscriptions' THEN 'rose'
                 WHEN 'travel' THEN 'cyan'
                 WHEN 'other' THEN 'steel'
                 ELSE color_token
               END,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
               sync_status = CASE
                 WHEN sync_status = 'local_only' THEN 'local_only'
                 ELSE 'pending'
               END
         WHERE is_default = 1
           AND (
             (template_key = 'restaurants' AND color_token = 'orange') OR
             (template_key = 'family' AND color_token = 'red') OR
             (template_key = 'leisure' AND color_token = 'violet') OR
             (template_key = 'subscriptions' AND color_token = 'pink') OR
             (template_key = 'travel' AND color_token = 'blue') OR
             (template_key = 'other' AND color_token = 'slate')
           );
      `);
    }

    if (currentVersion < 5) {
      await transaction.execAsync(`
        CREATE TABLE local_sync_account (
          singleton_id INTEGER PRIMARY KEY NOT NULL DEFAULT 1
            CHECK (singleton_id = 1),
          user_id TEXT NOT NULL,
          confirmed_at TEXT NOT NULL
        );

        CREATE TABLE local_sync_batches (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          installation_id TEXT NOT NULL,
          status TEXT NOT NULL
            CHECK (status IN ('syncing', 'completed', 'failed')),
          category_count INTEGER NOT NULL DEFAULT 0,
          series_count INTEGER NOT NULL DEFAULT 0,
          transaction_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        );

        CREATE INDEX local_sync_batches_user_status_idx
          ON local_sync_batches(user_id, status, updated_at DESC);
      `);
    }

    if (currentVersion < 6) {
      await transaction.execAsync(`
        CREATE TABLE transaction_reminders (
          id TEXT PRIMARY KEY NOT NULL,
          transaction_id TEXT NOT NULL,
          space_id TEXT NOT NULL,
          remind_on TEXT NOT NULL,
          times TEXT NOT NULL,
          notification_ids TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (transaction_id),
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE INDEX transaction_reminders_space_idx
          ON transaction_reminders(space_id, remind_on);
      `);
    }

    if (currentVersion < 7) {
      await transaction.execAsync(`
        CREATE TABLE transaction_notification_rules (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
          is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
          days_before INTEGER NOT NULL DEFAULT 1 CHECK (days_before >= 0),
          times TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (space_id, transaction_type)
        );

        CREATE INDEX transaction_notification_rules_space_idx
          ON transaction_notification_rules(space_id, is_enabled);

        CREATE TABLE transaction_notification_rule_schedules (
          id TEXT PRIMARY KEY NOT NULL,
          rule_id TEXT NOT NULL,
          space_id TEXT NOT NULL,
          occurrence_key TEXT NOT NULL,
          occurred_on TEXT NOT NULL,
          remind_on TEXT NOT NULL,
          notification_ids TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (rule_id) REFERENCES transaction_notification_rules(id) ON DELETE CASCADE,
          UNIQUE (rule_id, occurrence_key)
        );

        CREATE INDEX transaction_notification_rule_schedules_space_idx
          ON transaction_notification_rule_schedules(space_id, remind_on);
      `);
    }

    await transaction.execAsync(
      `PRAGMA user_version = ${localDatabaseVersion}`,
    );
  });
}

export function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(localDatabaseName).then(
      async (database) => {
        await migrateLocalDatabase(database);
        return database;
      },
    );
  }

  return databasePromise;
}
