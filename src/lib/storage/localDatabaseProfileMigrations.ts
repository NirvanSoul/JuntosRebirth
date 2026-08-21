import type * as SQLite from 'expo-sqlite';

/** Migraciones locales 17–19 del perfil y de los miembros de un espacio. */
export async function applyLocalProfileMigrations(
  transaction: SQLite.SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  // La versión 17 guarda el perfil de las demás personas de un espacio
  // compartido. `local_profile` no vale: es una fila única y describe a quien
  // usa el móvil. Sin esta tabla la interfaz solo puede atribuir un movimiento
  // a un uuid.
  if (currentVersion < 17) {
    await transaction.execAsync(`
      CREATE TABLE space_member_profiles (
        space_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (space_id, user_id)
      );
    `);
  }

  // La versión 18 añade el circuito de subida de la foto de perfil. Esta
  // caché de lectura se recrea para no arrastrar avatar_url, una URL que nunca
  // existió y que se repuebla entera en cada sincronización.
  if (currentVersion < 18) {
    await transaction.execAsync(`
      ALTER TABLE local_profile ADD COLUMN avatar_sync_status TEXT NOT NULL
        DEFAULT 'local_only'
        CHECK (avatar_sync_status IN (
          'local_only', 'pending', 'syncing', 'synced', 'failed', 'conflict'
        ));
      ALTER TABLE local_profile ADD COLUMN avatar_remote_path TEXT;

      DROP TABLE IF EXISTS space_member_profiles;
      CREATE TABLE space_member_profiles (
        space_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        display_name TEXT,
        avatar_path TEXT,
        avatar_updated_at TEXT,
        avatar_cached_uri TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (space_id, user_id)
      );
    `);
  }

  // La versión 19 guarda la moneda preferida de cada miembro del espacio.
  if (currentVersion < 19) {
    await transaction.execAsync(`
      ALTER TABLE space_member_profiles ADD COLUMN default_currency TEXT;
    `);
  }
}
