import * as SQLite from 'expo-sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';

import {
  localDatabaseVersion,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabaseMigrations';

export const localDatabaseName = 'juntoss.db';
export { localDatabaseVersion, migrateLocalDatabase };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let localWriteQueue: Promise<void> = Promise.resolve();
const serializedDatabases = new WeakSet<SQLite.SQLiteDatabase>();

function serializeLocalWrite<T>(operation: () => Promise<T>): Promise<T> {
  const task = localWriteQueue.catch(() => undefined).then(operation);
  localWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

/**
 * `withExclusiveTransactionAsync` abre una conexión SQLite adicional. Expo
 * aborta las escrituras que coinciden con esa conexión con `database is
 * locked`, incluso cuando proceden de la misma aplicación. Todos los accesos
 * locales pasan por este módulo, así que serializamos aquí las escrituras y
 * transacciones sin obligar a cada repositorio a conocer ese detalle nativo.
 */
function serializeDatabaseWrites(
  database: SQLite.SQLiteDatabase,
): SQLite.SQLiteDatabase {
  if (serializedDatabases.has(database)) return database;
  serializedDatabases.add(database);

  // Las guardas son únicamente para los dobles parciales de las pruebas; una
  // SQLiteDatabase nativa siempre implementa los cuatro métodos.
  if (typeof database.runAsync === 'function') {
    const runAsync = database.runAsync.bind(database);
    database.runAsync = ((source: string, ...params: SQLiteBindValue[]) =>
      serializeLocalWrite(() =>
        runAsync(source, ...params),
      )) as SQLite.SQLiteDatabase['runAsync'];
  }
  if (typeof database.execAsync === 'function') {
    const execAsync = database.execAsync.bind(database);
    database.execAsync = ((...args) =>
      serializeLocalWrite(() =>
        execAsync(...args),
      )) as SQLite.SQLiteDatabase['execAsync'];
  }
  if (typeof database.withTransactionAsync === 'function') {
    const withTransactionAsync = database.withTransactionAsync.bind(database);
    database.withTransactionAsync = ((task) =>
      serializeLocalWrite(() =>
        withTransactionAsync(task),
      )) as SQLite.SQLiteDatabase['withTransactionAsync'];
  }
  if (typeof database.withExclusiveTransactionAsync === 'function') {
    const withExclusiveTransactionAsync =
      database.withExclusiveTransactionAsync.bind(database);
    database.withExclusiveTransactionAsync = ((task) =>
      serializeLocalWrite(() =>
        withExclusiveTransactionAsync(task),
      )) as SQLite.SQLiteDatabase['withExclusiveTransactionAsync'];
  }

  return database;
}

function isDatabaseLockedError(error: unknown): boolean {
  return error instanceof Error && /database is locked/i.test(error.message);
}

/**
 * Abre la base y migra sin borrar datos ante un fallo. Los datos locales son
 * la caché de trabajo de una sesión autenticada;
 * ante una migración inesperada deben conservarse para poder repararlos o
 * exportarlos, nunca sustituirse silenciosamente por un archivo vacío.
 */
async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const database = serializeDatabaseWrites(
    await SQLite.openDatabaseAsync(localDatabaseName),
  );
  try {
    // Un bloqueo puede provenir de una conexión nativa que está terminando al
    // reabrir la app. Reintentamos un número acotado de veces; no borramos la
    // caché ni convertimos una contención local en pérdida de datos.
    for (let attempt = 0; ; attempt += 1) {
      try {
        await migrateLocalDatabase(database);
        break;
      } catch (error) {
        if (!isDatabaseLockedError(error) || attempt === 2) throw error;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100 * (attempt + 1));
        });
      }
    }
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
  const currentDatabase = databasePromise;
  databasePromise = null;
  let database: SQLite.SQLiteDatabase | null = null;
  try {
    database = await currentDatabase;
  } catch {
    // Si la apertura ya falló, no hay conexión utilizable que cerrar.
  }

  try {
    await database?.closeAsync();
  } catch {
    // Una conexión ya cerrada no impide intentar borrar el archivo.
  }
  try {
    await SQLite.deleteDatabaseAsync(localDatabaseName);
  } catch {
    // No hay archivo que borrar (ya no existía) o el borrado falló por una
    // razón que de todos modos no podemos resolver aquí: lo importante es
    // que la próxima apertura no reutilice una promesa/conexión rota.
  }
}
