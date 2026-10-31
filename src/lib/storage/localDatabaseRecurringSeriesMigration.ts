import type * as SQLite from 'expo-sqlite';

/**
 * Migración local 32. El servidor guarda `next_occurrence_on = NULL` cuando
 * una serie no tiene próxima ocurrencia (archivada, o personalizada sin
 * fechas pendientes), y lo envía así en el snapshot. La columna local era
 * NOT NULL y la restauración fallaba al recibir esas series.
 *
 * SQLite no permite quitar un NOT NULL con ALTER, así que se reconstruye la
 * tabla. `transactions.recurrence_series_id` la referencia con RESTRICT: este
 * paso debe correr con `foreign_keys = OFF` y `legacy_alter_table = ON`, para
 * que el DROP no choque con las ocurrencias ni el renombrado reescriba esa
 * referencia hacia la tabla temporal.
 */
export async function applyNullableSeriesNextOccurrenceMigration(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion >= 32) return;

  await transaction.execAsync(`
    CREATE TABLE recurring_transaction_series_v32 (
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
      next_occurrence_on TEXT,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
        CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      money_account_id TEXT REFERENCES money_accounts(id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id, space_id)
        REFERENCES categories(id, space_id) ON DELETE RESTRICT
    );

    INSERT INTO recurring_transaction_series_v32 (
      id, space_id, category_id, created_by, type, amount_minor, currency,
      title, frequency, starts_on, generated_occurrences, next_occurrence_on,
      sync_status, is_archived, created_at, updated_at, archived_at,
      money_account_id
    )
    SELECT id, space_id, category_id, created_by, type, amount_minor, currency,
           title, frequency, starts_on, generated_occurrences,
           next_occurrence_on, sync_status, is_archived, created_at,
           updated_at, archived_at, money_account_id
      FROM recurring_transaction_series;

    DROP TABLE recurring_transaction_series;
    ALTER TABLE recurring_transaction_series_v32
      RENAME TO recurring_transaction_series;

    CREATE INDEX recurring_series_due_idx
      ON recurring_transaction_series(is_archived, next_occurrence_on);
  `);
}
