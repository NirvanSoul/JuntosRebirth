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
