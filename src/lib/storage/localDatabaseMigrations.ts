import type * as SQLite from 'expo-sqlite';

import {
  createInitialSchema,
  createRecurringSeriesSchema,
} from '@/lib/storage/localDatabaseBaseSchema';
import { withLegacyMoneyAccountRebuildTransaction } from '@/lib/storage/localDatabaseLegacyMoneyAccountMigration';
import { applyMoneyAccountMigrations } from '@/lib/storage/localDatabaseMoneyAccountSchema';
import { applyLocalProfileMigrations } from '@/lib/storage/localDatabaseProfileMigrations';
import { ensureLocalProfileDisplayNameColumn } from '@/lib/storage/localDatabaseSchemaRepair';

/**
 * Versión del esquema local. Cada incremento añade abajo un bloque
 * `if (currentVersion < N)` que solo corre en dispositivos por debajo de esa
 * versión, de modo que la escalera es acumulativa y ningún bloque se
 * reejecuta.
 */
export const localDatabaseVersion = 26;

export async function migrateLocalDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON');
  await database.execAsync('PRAGMA busy_timeout = 5000');

  // Cambiar el journal mode pide un bloqueo exclusivo. Una base que ya está
  // en WAL no necesita repetirlo en cada arranque, y así evitamos competir con
  // una conexión que solo esté terminando de leer la caché local.
  const journalMode = await database.getFirstAsync<{ journal_mode: string }>(
    'PRAGMA journal_mode',
  );
  if (journalMode?.journal_mode?.toLowerCase() !== 'wal') {
    await database.execAsync('PRAGMA journal_mode = WAL');
  }

  const versionRow = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > localDatabaseVersion) {
    throw new Error('La base local pertenece a una versión más reciente');
  }
  if (currentVersion === localDatabaseVersion) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await applyMoneyAccountMigrations(transaction, currentVersion);
    });
    await ensureLocalProfileDisplayNameColumn(database);
    return;
  }

  const needsLegacyMoneyAccountRebuild =
    currentVersion >= 20 && currentVersion < 22;
  const runMigrations = async (transaction: SQLite.SQLiteDatabase) => {
    if (currentVersion < 1) {
      await createInitialSchema(transaction);
    }

    if (currentVersion < 2) {
      await createRecurringSeriesSchema(transaction);
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

    await applyLocalProfileMigrations(transaction, currentVersion);

    await applyMoneyAccountMigrations(transaction, currentVersion);

    await transaction.execAsync(
      `PRAGMA user_version = ${localDatabaseVersion}`,
    );
  };
  if (needsLegacyMoneyAccountRebuild) {
    await withLegacyMoneyAccountRebuildTransaction(database, runMigrations);
  } else {
    await database.withExclusiveTransactionAsync(runMigrations);
  }
}
