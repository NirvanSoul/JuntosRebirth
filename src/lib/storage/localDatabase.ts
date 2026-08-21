import * as SQLite from 'expo-sqlite';

import {
  localDatabaseVersion,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabaseMigrations';

export const localDatabaseName = 'juntoss.db';
export { localDatabaseVersion, migrateLocalDatabase };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre la base y migra sin borrar datos ante un fallo. Los datos locales son
 * la fuente de verdad para invitados y la caché de trabajo para una sesión;
 * ante una migración inesperada deben conservarse para poder repararlos o
 * exportarlos, nunca sustituirse silenciosamente por un archivo vacío.
 */
async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(localDatabaseName);
  try {
    await migrateLocalDatabase(database);
    return database;
  } catch (error) {
    console.error(
      '[localDatabase] La migración falló; se conservó la base local',
      error,
    );
    throw error;
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
