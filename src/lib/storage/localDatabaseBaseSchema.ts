import type * as SQLite from 'expo-sqlite';

/**
 * Bloques fundacionales del esquema local: las versiones 1 y 2, que crean las
 * tablas desde cero. Viven aparte de la escalera de migraciones porque son la
 * mitad de su volumen y no vuelven a tocarse: un dispositivo nuevo los corre
 * una vez y ninguno de los dos admite ya cambios, al estar la forma posterior
 * de cada tabla gobernada por las migraciones incrementales.
 */

/** Versión 1: tablas iniciales de metadatos, categorías y movimientos. */
export async function createInitialSchema(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
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

/** Versión 2: series recurrentes y reconstrucción de `transactions`. */
export async function createRecurringSeriesSchema(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
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
