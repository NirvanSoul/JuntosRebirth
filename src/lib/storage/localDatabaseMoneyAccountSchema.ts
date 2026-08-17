import type * as SQLite from 'expo-sqlite';

/**
 * Esquema de cuentas (versión local 20): un segundo eje de clasificación
 * opcional junto a la categoría, con saldo propio.
 *
 * `transactions.money_account_id` y su equivalente en las series usan una
 * clave foránea de una sola columna, no la compuesta `(id, space_id)` que sí
 * protege a `category_id`. SQLite no admite una foránea de dos columnas en
 * `ALTER TABLE ADD COLUMN`, y reconstruir `transactions` reescribiría de paso
 * la foránea de `transaction_reminders`: el procedimiento seguro documentado
 * por SQLite exige `PRAGMA foreign_keys = OFF` fuera de la transacción, algo
 * que el migrador no hace. La coincidencia de espacio se valida entonces en
 * `localTransactionRepository`, y en Postgres —la autoridad real— la
 * migración 28 sí declara la foránea compuesta.
 */
export async function createMoneyAccountSchema(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
  await transaction.execAsync(`
    CREATE TABLE money_accounts (
      id TEXT PRIMARY KEY NOT NULL,
      space_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL
        CHECK (kind IN ('cash', 'bank', 'debit', 'credit', 'savings')),
      icon TEXT NOT NULL,
      color_token TEXT NOT NULL,
      currency TEXT NOT NULL,
      opening_balance_minor INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'local_only'
        CHECK (sync_status IN (
          'local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict'
        )),
      is_archived INTEGER NOT NULL DEFAULT 0
        CHECK (is_archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      UNIQUE (id, space_id)
    );

    CREATE INDEX money_accounts_space_active_idx
      ON money_accounts(space_id, is_archived, name);
    CREATE INDEX money_accounts_sync_idx
      ON money_accounts(sync_status, updated_at);

    ALTER TABLE transactions ADD COLUMN money_account_id TEXT
      REFERENCES money_accounts(id) ON DELETE RESTRICT;
    ALTER TABLE recurring_transaction_series ADD COLUMN money_account_id
      TEXT REFERENCES money_accounts(id) ON DELETE RESTRICT;

    CREATE INDEX transactions_money_account_idx
      ON transactions(money_account_id, is_archived, occurred_on DESC)
      WHERE money_account_id IS NOT NULL;
  `);
}

/**
 * Admite `money_account` en el mapa de identidades remotas (versión local 21).
 * Un CHECK de SQLite no se puede alterar, así que la tabla se reconstruye;
 * nada la referencia y sus filas se copian tal cual.
 */
export async function recreateRemoteEntityLinksWithMoneyAccounts(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
  await transaction.execAsync(`
        ALTER TABLE remote_entity_links RENAME TO remote_entity_links_v13;

        CREATE TABLE remote_entity_links (
          user_id TEXT NOT NULL,
          entity_type TEXT NOT NULL
            CHECK (entity_type IN (
              'space', 'category', 'money_account', 'transaction'
            )),
          remote_id TEXT NOT NULL,
          local_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (user_id, entity_type, remote_id),
          UNIQUE (user_id, entity_type, local_id)
        );

        INSERT INTO remote_entity_links (
          user_id, entity_type, remote_id, local_id, created_at, updated_at
        )
        SELECT user_id, entity_type, remote_id, local_id, created_at, updated_at
          FROM remote_entity_links_v13;

        DROP TABLE remote_entity_links_v13;

        CREATE INDEX remote_entity_links_local_idx
          ON remote_entity_links(user_id, entity_type, local_id);
      `);
}
