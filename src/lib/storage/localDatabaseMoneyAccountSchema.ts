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

/**
 * Reduce los tipos de cuenta a tres (versión local 22): efectivo, cuenta
 * bancaria y tarjeta. Los cinco iniciales distinguían débito, crédito y ahorro,
 * una separación que no aporta nada mientras el saldo se calcule igual en
 * todos y no existan ni límite de crédito ni transferencias.
 *
 * Un CHECK de SQLite no se puede alterar, así que la tabla se reconstruye. Las
 * filas existentes se reasignan: débito y crédito pasan a tarjeta, y ahorro a
 * cuenta bancaria, que es donde suele estar guardado ese dinero.
 */
export async function reduceMoneyAccountKinds(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
  await transaction.execAsync(`
    ALTER TABLE money_accounts RENAME TO money_accounts_v20;

    CREATE TABLE money_accounts (
      id TEXT PRIMARY KEY NOT NULL,
      space_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('cash', 'bank', 'card')),
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

    INSERT INTO money_accounts (
      id, space_id, name, kind, icon, color_token, currency,
      opening_balance_minor, created_by, sync_status, is_archived,
      created_at, updated_at, archived_at
    )
    SELECT id, space_id, name,
           CASE kind
             WHEN 'debit' THEN 'card'
             WHEN 'credit' THEN 'card'
             WHEN 'savings' THEN 'bank'
             ELSE kind
           END,
           icon, color_token, currency, opening_balance_minor, created_by,
           sync_status, is_archived, created_at, updated_at, archived_at
      FROM money_accounts_v20;

    DROP TABLE money_accounts_v20;

    CREATE INDEX money_accounts_space_active_idx
      ON money_accounts(space_id, is_archived, name);
    CREATE INDEX money_accounts_sync_idx
      ON money_accounts(sync_status, updated_at);
  `);
}

/**
 * Repara la foránea que la versión 22 dejó colgando (versión local 23).
 *
 * Al reconstruir `money_accounts` con `ALTER TABLE ... RENAME`, SQLite
 * reescribe las referencias que apuntaban a esa tabla: `transactions` y
 * `recurring_transaction_series` pasaron a referenciar `money_accounts_v20`,
 * que acto seguido se borraba. Con esa referencia rota, asignar una cuenta a
 * un movimiento fallaba con «no such table: main.money_accounts_v20».
 *
 * La reparación son dos renombrados y ningún copiado: el primero deja la tabla
 * con el nombre que las referencias rotas esperan, y el segundo la devuelve a
 * su nombre reescribiéndolas de paso. Es idempotente: si las referencias ya
 * eran correctas, el primer renombrado las mueve y el segundo las devuelve.
 */
export async function repairMoneyAccountReferences(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
  await transaction.execAsync(`
    ALTER TABLE money_accounts RENAME TO money_accounts_v20;
    ALTER TABLE money_accounts_v20 RENAME TO money_accounts;
  `);
}

/**
 * Aplica en orden los peldaños de la escalera que pertenecen a las cuentas.
 * Agruparlos aquí mantiene el migrador general legible: desde allí las cuentas
 * son un único paso, y el detalle de cada versión vive junto al esquema.
 */
export async function applyMoneyAccountMigrations(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  if (currentVersion < 20) await createMoneyAccountSchema(transaction);
  if (currentVersion < 21)
    await recreateRemoteEntityLinksWithMoneyAccounts(transaction);
  if (currentVersion < 22) await reduceMoneyAccountKinds(transaction);
  if (currentVersion < 23) await repairMoneyAccountReferences(transaction);
  if (currentVersion < 24) await createMoneyAccountBalancesSchema(transaction);
}

/**
 * Una cuenta puede guardar varias monedas (versión local 24).
 *
 * Hay bancos que mantienen divisas distintas dentro de la misma cuenta, y cada
 * una lleva su propio saldo: sumarlas no significaría nada. La tabla hija
 * sigue el patrón de `category_budgets`, que ya resuelve lo mismo para los
 * presupuestos.
 *
 * `money_accounts.currency` se conserva como moneda principal —la que encabeza
 * la tarjeta y se propone al registrar un movimiento—, pero el saldo inicial
 * deja de leerse de `money_accounts.opening_balance_minor`: a partir de aquí
 * vive siempre en esta tabla, incluida la moneda principal, para no repetir el
 * error de mantener dos fuentes de verdad.
 *
 * El bloque es idempotente a propósito: mientras la escalera está en obras,
 * una recarga a medias no debe dejar la base en un estado que obligue a
 * borrarla entera.
 */
export async function createMoneyAccountBalancesSchema(
  transaction: SQLite.SQLiteDatabase,
): Promise<void> {
  await transaction.execAsync(`
    CREATE TABLE IF NOT EXISTS money_account_balances (
      id TEXT PRIMARY KEY NOT NULL,
      money_account_id TEXT NOT NULL,
      currency TEXT NOT NULL,
      opening_balance_minor INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (money_account_id, currency),
      FOREIGN KEY (money_account_id)
        REFERENCES money_accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS money_account_balances_account_idx
      ON money_account_balances(money_account_id, position);

    INSERT OR IGNORE INTO money_account_balances (
      id, money_account_id, currency, opening_balance_minor, position,
      created_at, updated_at
    )
    SELECT 'primary-balance-' || id, id, currency, opening_balance_minor, 0,
           created_at, updated_at
      FROM money_accounts;
  `);
}
