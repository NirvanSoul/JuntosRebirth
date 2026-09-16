import type * as SQLite from 'expo-sqlite';

/**
 * Salvaguarda puntual para `local_profile.display_name`: durante el desarrollo
 * de esta sesión, un dispositivo llegó a quedar con `user_version = 16` (por
 * haber corrido una build intermedia que ya subía la versión) sin que la
 * columna se hubiera creado todavía, porque el bloque `currentVersion < 16` de
 * `migrateLocalDatabase` solo corre una vez por dispositivo. Como
 * `currentVersion === localDatabaseVersion` corta la migración antes de llegar
 * a ese bloque, cualquier drift entre el número de versión y el esquema real
 * queda sin forma de repararse. Esta comprobación es barata (una
 * `PRAGMA table_info`) y corre siempre que el atajo de versión igual se toma,
 * así un dispositivo con ese drift se autorepara en el próximo arranque en vez
 * de fallar para siempre al guardar el nombre.
 */
export async function ensureLocalProfileDisplayNameColumn(
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

/**
 * Misma salvaguarda que `ensureLocalProfileDisplayNameColumn`, para
 * `local_profile.country_code`.
 */
export async function ensureLocalProfileCountryCodeColumn(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(local_profile)',
  );
  const hasCountryCode = columns.some(
    (column) => column.name === 'country_code',
  );
  if (!hasCountryCode) {
    await database.execAsync(
      'ALTER TABLE local_profile ADD COLUMN country_code TEXT',
    );
  }
}

/**
 * Misma salvaguarda que `ensureLocalProfileDisplayNameColumn`, para
 * `local_profile.display_name_sync_status`.
 */
export async function ensureLocalProfileDisplayNameSyncStatusColumn(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(local_profile)',
  );
  const hasColumn = columns.some(
    (column) => column.name === 'display_name_sync_status',
  );
  if (!hasColumn) {
    await database.execAsync(
      `ALTER TABLE local_profile ADD COLUMN display_name_sync_status TEXT NOT NULL
        DEFAULT 'synced'
        CHECK (display_name_sync_status IN ('pending', 'synced', 'failed'))`,
    );
  }
}

/**
 * Repara una instalación que ya llegó a la versión 29, pero cuya build
 * intermedia marcó la versión antes de añadir las columnas de tasas. Sin esta
 * comprobación la restauración remota falla al recibir un movimiento creado
 * con el modo Venezuela.
 */
export async function ensureTransactionExchangeRateColumns(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(transactions)',
  );
  const names = new Set(columns.map((column) => column.name));
  if (!names.has('custom_rate_id')) {
    await database.execAsync(
      'ALTER TABLE transactions ADD COLUMN custom_rate_id TEXT',
    );
  }
  if (!names.has('exchange_snapshot_json')) {
    await database.execAsync(
      'ALTER TABLE transactions ADD COLUMN exchange_snapshot_json TEXT',
    );
  }
  if (!names.has('accounting_amount_minor_usd')) {
    await database.execAsync(
      'ALTER TABLE transactions ADD COLUMN accounting_amount_minor_usd INTEGER',
    );
  }
}
