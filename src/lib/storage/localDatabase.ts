import * as SQLite from 'expo-sqlite';

import {
  localDatabaseVersion,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabaseMigrations';

export const localDatabaseName = 'juntoss.db';
export { localDatabaseVersion, migrateLocalDatabase };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
