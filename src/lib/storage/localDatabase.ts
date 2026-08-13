import * as SQLite from 'expo-sqlite';

export const localDatabaseName = 'juntoss.db';
export const localDatabaseVersion = 16;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Salvaguarda puntual para `local_profile.display_name`: durante el
 * desarrollo de esta sesión, un dispositivo llegó a quedar con
 * `user_version = 16` (por haber corrido una build intermedia que ya subía
 * la versión) sin que la columna se hubiera creado todavía, porque el
 * bloque `currentVersion < 16` de abajo solo corre una vez por dispositivo.
 * Como `currentVersion === localDatabaseVersion` corta la función antes de
 * llegar a ese bloque, cualquier drift entre el número de versión y el
 * esquema real queda sin forma de repararse. Esta comprobación es barata
 * (una `PRAGMA table_info`) y corre siempre que el atajo de versión igual
 * se toma, así un dispositivo con ese drift se autorepara en el próximo
 * arranque en vez de fallar para siempre al guardar el nombre.
 */
async function ensureLocalProfileDisplayNameColumn(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(local_profile)',
  );
  const hasDisplayName = columns.some(
    (column) => column.name === 'display_name',
  );
  if (!hasDisplayName) {
    await database.execAsync(
      'ALTER TABLE local_profile ADD COLUMN display_name TEXT',
    );
  }
}

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
  if (currentVersion === localDatabaseVersion) {
    await ensureLocalProfileDisplayNameColumn(database);
    return;
  }

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

    if (currentVersion < 8) {
      await transaction.execAsync(`
        ALTER TABLE categories ADD COLUMN note TEXT;
        ALTER TABLE transactions ADD COLUMN note TEXT;
      `);
    }

    if (currentVersion < 9) {
      await transaction.execAsync(`
        CREATE TABLE local_profile (
          singleton_id INTEGER PRIMARY KEY NOT NULL DEFAULT 1
            CHECK (singleton_id = 1),
          avatar_path TEXT,
          avatar_updated_at TEXT
        );
      `);
    }

    if (currentVersion < 10) {
      // categories.budget_minor only ever stored a single currency-less
      // budget, assumed EUR before ADR-060 introduced per-movement
      // currencies. This adds a per-currency budgets table (up to 3
      // currencies per category, enforced in localCategoryRepository)
      // without touching budget_minor: it stays as historical data and
      // nothing writes to it anymore.
      await transaction.execAsync(`
        CREATE TABLE category_budgets (
          id TEXT PRIMARY KEY NOT NULL,
          category_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          budget_minor INTEGER NOT NULL CHECK (budget_minor > 0),
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (category_id, currency),
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE INDEX category_budgets_category_idx
          ON category_budgets(category_id);

        INSERT INTO category_budgets (
          id, category_id, currency, budget_minor, sync_status, created_at, updated_at
        )
        SELECT 'legacy-budget-' || id, id, 'EUR', budget_minor, sync_status,
               created_at, updated_at
          FROM categories
         WHERE budget_minor IS NOT NULL;
      `);
    }

    if (currentVersion < 11) {
      await transaction.execAsync(`
        CREATE TABLE import_merchant_rules (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          normalized_merchant TEXT NOT NULL,
          category_id TEXT NOT NULL,
          confirmations INTEGER NOT NULL DEFAULT 1
            CHECK (confirmations >= 1),
          source TEXT NOT NULL DEFAULT 'import_correction'
            CHECK (source IN ('manual', 'import_correction', 'system')),
          last_used_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (space_id, normalized_merchant),
          FOREIGN KEY (category_id, space_id)
            REFERENCES categories(id, space_id) ON DELETE RESTRICT
        );

        CREATE INDEX import_merchant_rules_space_merchant_idx
          ON import_merchant_rules(space_id, normalized_merchant);
        CREATE INDEX import_merchant_rules_sync_idx
          ON import_merchant_rules(sync_status, updated_at);
      `);
    }

    if (currentVersion < 12) {
      await transaction.execAsync(`
        CREATE TABLE import_batches (
          id TEXT PRIMARY KEY NOT NULL,
          space_id TEXT NOT NULL,
          source_type TEXT NOT NULL CHECK (source_type IN ('xls', 'xlsx', 'csv')),
          source_profile TEXT,
          status TEXT NOT NULL CHECK (status IN (
            'parsing', 'mapping_required', 'needs_review', 'ready',
            'imported', 'failed', 'cancelled'
          )),
          total_items INTEGER NOT NULL DEFAULT 0 CHECK (total_items >= 0),
          review_items INTEGER NOT NULL DEFAULT 0 CHECK (review_items >= 0),
          duplicate_items INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_items >= 0),
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          UNIQUE (id, space_id)
        );

        CREATE TABLE import_items (
          id TEXT PRIMARY KEY NOT NULL,
          batch_id TEXT NOT NULL,
          space_id TEXT NOT NULL,
          source_row INTEGER NOT NULL CHECK (source_row > 0),
          raw_description TEXT NOT NULL,
          normalized_merchant TEXT NOT NULL,
          occurred_on TEXT,
          amount_minor INTEGER,
          currency TEXT,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('expense', 'income', 'unknown')),
          suggested_category_id TEXT,
          final_category_id TEXT,
          duplicate_status TEXT NOT NULL CHECK (duplicate_status IN ('none', 'exact', 'probable')),
          item_status TEXT NOT NULL CHECK (item_status IN (
            'pending', 'ready', 'ignored', 'duplicate', 'imported', 'error'
          )),
          is_selected INTEGER NOT NULL DEFAULT 0 CHECK (is_selected IN (0, 1)),
          created_transaction_id TEXT,
          issues TEXT NOT NULL CHECK (json_valid(issues)),
          sync_status TEXT NOT NULL DEFAULT 'local_only'
            CHECK (sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (batch_id, space_id)
            REFERENCES import_batches(id, space_id) ON DELETE CASCADE,
          FOREIGN KEY (final_category_id, space_id)
            REFERENCES categories(id, space_id) ON DELETE RESTRICT
        );

        CREATE INDEX import_batches_space_status_idx
          ON import_batches(space_id, status, updated_at DESC);
        CREATE INDEX import_items_batch_idx ON import_items(batch_id);
        CREATE INDEX import_items_sync_idx ON import_items(sync_status, updated_at);
      `);
    }

    if (currentVersion < 13) {
      await transaction.execAsync(`
        CREATE TABLE remote_entity_links (
          user_id TEXT NOT NULL,
          entity_type TEXT NOT NULL
            CHECK (entity_type IN ('space', 'category', 'transaction')),
          remote_id TEXT NOT NULL,
          local_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, entity_type, remote_id),
          UNIQUE (user_id, entity_type, local_id)
        );

        CREATE INDEX remote_entity_links_local_idx
          ON remote_entity_links(user_id, entity_type, local_id);
      `);
    }

    if (currentVersion < 14) {
      await transaction.execAsync(`
        ALTER TABLE import_batches ADD COLUMN file_hash TEXT;

        CREATE INDEX import_batches_file_hash_idx
          ON import_batches(space_id, file_hash) WHERE file_hash IS NOT NULL;
      `);
    }

    if (currentVersion < 15) {
      await transaction.execAsync(`
        CREATE TABLE merchant_feedback_queue (
          id TEXT PRIMARY KEY NOT NULL,
          import_item_id TEXT NOT NULL,
          canonical_category_key TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (import_item_id)
        );

        CREATE INDEX merchant_feedback_queue_status_idx
          ON merchant_feedback_queue(status, updated_at);
      `);
    }

    if (currentVersion < 16) {
      await transaction.execAsync(`
        ALTER TABLE local_profile ADD COLUMN display_name TEXT;
      `);
    }

    await transaction.execAsync(
      `PRAGMA user_version = ${localDatabaseVersion}`,
    );
  });
}

/**
 * Abre la base y migra. Si la migración falla (p. ej. `user_version` quedó
 * por delante de `localDatabaseVersion` porque el dispositivo corrió una
 * build de desarrollo con un esquema distinto, o el archivo quedó a medio
 * migrar por un cierre abrupto), el archivo local no contiene nada que no
 * se pueda regenerar: se borra y se reintenta una sola vez con una base
 * nueva en vez de dejar la app rota hasta que alguien la reinstale a mano.
 */
async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(localDatabaseName);
  try {
    await migrateLocalDatabase(database);
    return database;
  } catch (error) {
    console.error(
      '[localDatabase] La migración falló, reiniciando la base local',
      error,
    );
    await resetLocalDatabase();
    const freshDatabase = await SQLite.openDatabaseAsync(localDatabaseName);
    await migrateLocalDatabase(freshDatabase);
    return freshDatabase;
  }
}

export function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      // Si abrir o migrar falla (p. ej. un fallo transitorio en el primer
      // arranque, o el reintento automático de arriba también falló), no
      // dejamos la promesa en caché: así la próxima pantalla que pida la
      // base de datos reintenta desde cero en vez de heredar el mismo
      // rechazo para el resto de la sesión.
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

/**
 * Descarta la conexión en caché y borra el archivo `.db` del dispositivo.
 * Última vía de escape cuando abrir o migrar la base falla de forma
 * persistente (p. ej. corrupción): la próxima llamada a `getLocalDatabase`
 * parte de un archivo nuevo en vez de reintentar contra el mismo roto.
 */
export async function resetLocalDatabase(): Promise<void> {
  databasePromise = null;
  try {
    await SQLite.deleteDatabaseAsync(localDatabaseName);
  } catch {
    // No hay archivo que borrar (ya no existía) o el borrado falló por una
    // razón que de todos modos no podemos resolver aquí: lo importante es
    // que la próxima apertura no reutilice una promesa/conexión rota.
  }
}
