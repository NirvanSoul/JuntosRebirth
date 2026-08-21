import type * as SQLite from 'expo-sqlite';

type ForeignKeyViolation = {
  table: string;
};

/**
 * Ejecuta la reconstrucción histórica de cuentas en la conexión principal.
 * `withExclusiveTransactionAsync` abre otra conexión y los PRAGMA de SQLite
 * son locales a cada una; por eso el BEGIN EXCLUSIVE y los PRAGMA viven aquí.
 */
export async function withLegacyMoneyAccountRebuildTransaction(
  database: SQLite.SQLiteDatabase,
  task: (database: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<void> {
  let foreignKeysWereDisabled = false;
  let legacyAlterTableWasEnabled = false;
  let transactionStarted = false;

  try {
    await database.execAsync('PRAGMA foreign_keys = OFF');
    foreignKeysWereDisabled = true;
    await database.execAsync('PRAGMA legacy_alter_table = ON');
    legacyAlterTableWasEnabled = true;

    await database.execAsync('BEGIN EXCLUSIVE');
    transactionStarted = true;
    await task(database);

    const violations = await database.getAllAsync<ForeignKeyViolation>(
      'PRAGMA foreign_key_check',
    );
    if (violations.length > 0) {
      throw new Error(
        `La migración local dejó ${violations.length} foránea(s) sin resolver`,
      );
    }

    await database.execAsync('COMMIT');
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await database.execAsync('ROLLBACK');
    throw error;
  } finally {
    if (legacyAlterTableWasEnabled)
      await database.execAsync('PRAGMA legacy_alter_table = OFF');
    if (foreignKeysWereDisabled)
      await database.execAsync('PRAGMA foreign_keys = ON');
  }
}
