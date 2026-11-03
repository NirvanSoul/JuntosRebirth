import * as SQLite from 'expo-sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';

import { markStartup } from '@/lib/diagnostics/startupTrace';
import { LocalCacheIsolationError } from '@/lib/storage/localCacheIsolationError';
import {
  localDatabaseVersion,
  migrateLocalDatabase,
} from '@/lib/storage/localDatabaseMigrations';

export const localDatabaseName = 'juntoss.db';
export { localDatabaseVersion, migrateLocalDatabase };

/** Prefijo de los archivos donde se aparta una caché sin propietario. */
export const unattributedDatabasePrefix = 'juntoss-unattributed-';

type PendingIsolation = {
  kind: 'discard' | 'quarantine';
  cause: unknown;
  /**
   * Cuenta cuya entrada decidió la limpieza: la caché no era suya. Si entra
   * otra, la decisión ya no vale (la caché podría ser de quien entra) y se
   * vuelve a clasificar. Sin cuenta, la decisión fue de quien cerró sesión y
   * se repite con cualquiera.
   */
  forUserId?: string;
};

type IsolationOptions = { forUserId?: string };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let resetPromise: Promise<void> | null = null;
/** Limpieza que falló y mantiene la caché bloqueada hasta reintentarla. */
let pendingIsolation: PendingIsolation | null = null;
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
    markStartup('local_db_ready');
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
  // Una limpieza que falló deja en el dispositivo una caché que no se pudo
  // apartar. Reabrirla la asociaría a la sesión siguiente: nadie la recibe
  // hasta que `retryPendingLocalDatabaseIsolation` complete esa limpieza.
  if (pendingIsolation) {
    return Promise.reject(
      new LocalCacheIsolationError(
        pendingIsolation.kind === 'discard'
          ? 'discard_failed'
          : 'quarantine_failed',
        { cause: pendingIsolation.cause },
      ),
    );
  }

  // Una limpieza en curso va a cerrar la conexión y borrar el archivo. Abrir
  // ahora entregaría una base a punto de desaparecer, y peor: una segunda
  // conexión leería `user_version` antes de que la primera confirmase su
  // migración y repetiría peldaños ya aplicados. Esperamos y reintentamos.
  if (resetPromise) return resetPromise.then(() => getLocalDatabase());

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

async function closeQuietly(
  pendingDatabase: Promise<SQLite.SQLiteDatabase> | null,
): Promise<void> {
  let database: SQLite.SQLiteDatabase | null = null;
  try {
    database = await pendingDatabase;
  } catch {
    // Si la apertura ya falló, no hay conexión utilizable que cerrar.
  }

  try {
    await database?.closeAsync();
  } catch (error) {
    // Un cierre fallido no se propaga por sí solo: lo que garantiza el
    // aislamiento es el borrado de abajo, que sí falla si la conexión sigue
    // abierta y entonces bloquea la caché.
    console.error('[localDatabase] No se pudo cerrar la conexión', error);
  }
}

async function discardLocalDatabase(
  pendingDatabase: Promise<SQLite.SQLiteDatabase> | null,
): Promise<void> {
  await closeQuietly(pendingDatabase);
  try {
    await SQLite.deleteDatabaseAsync(localDatabaseName);
  } catch (error) {
    // Sin archivo no queda nada que aislar. Cualquier otro fallo deja en el
    // dispositivo los datos de la sesión anterior: se propaga para que nadie
    // reabra esa base ni la asocie a otra cuenta.
    if (!isDatabaseNotFoundError(error)) throw error;
  }
}

/** Expo usa el mismo código para «no existe» y «no se pudo borrar». */
function isDatabaseNotFoundError(error: unknown): boolean {
  return error instanceof Error && /database .* not found/i.test(error.message);
}

/**
 * Copia la caché a un archivo aparte, comprueba la copia y solo entonces
 * borra el original. Si cualquier paso falla, el original queda intacto.
 */
async function quarantineDatabaseFile(
  pendingDatabase: Promise<SQLite.SQLiteDatabase> | null,
): Promise<string> {
  const source =
    (await pendingDatabase?.catch(() => null)) ??
    (await SQLite.openDatabaseAsync(localDatabaseName));
  const quarantineName = `${unattributedDatabasePrefix}${Date.now()}.db`;
  const destination = await SQLite.openDatabaseAsync(quarantineName, {
    useNewConnection: true,
  });
  try {
    await SQLite.backupDatabaseAsync({
      sourceDatabase: source,
      destDatabase: destination,
    });
    const check = await destination.getFirstAsync<{ quick_check: string }>(
      'PRAGMA quick_check',
    );
    if (check?.quick_check !== 'ok') {
      throw new Error('La copia aislada de la caché no es íntegra');
    }
  } catch (error) {
    await destination.closeAsync().catch(() => undefined);
    await SQLite.deleteDatabaseAsync(quarantineName).catch(() => undefined);
    // El original sigue intacto; su conexión se cierra para que nadie la
    // reutilice mientras la caché está bloqueada.
    await closeQuietly(Promise.resolve(source));
    throw error;
  }
  await destination.closeAsync();
  await discardLocalDatabase(Promise.resolve(source));
  return quarantineName;
}

function runIsolation<T>(
  kind: PendingIsolation['kind'],
  operation: (
    pendingDatabase: Promise<SQLite.SQLiteDatabase> | null,
  ) => Promise<T>,
  options: IsolationOptions = {},
): Promise<T> {
  const pendingDatabase = databasePromise;
  // `databasePromise` se conserva hasta terminar: mientras tanto
  // `getLocalDatabase` espera a `resetPromise`, así que nadie recibe la
  // conexión que estamos cerrando ni abre una nueva sobre el archivo a medio
  // borrar.
  const task = operation(pendingDatabase).then(
    (result) => {
      pendingIsolation = null;
      return result;
    },
    (error: unknown) => {
      pendingIsolation = { kind, cause: error, forUserId: options.forUserId };
      throw new LocalCacheIsolationError(
        kind === 'discard' ? 'discard_failed' : 'quarantine_failed',
        { cause: error },
      );
    },
  );
  const settled = task.then(
    () => undefined,
    () => undefined,
  );
  resetPromise = settled.finally(() => {
    databasePromise = null;
    resetPromise = null;
  });
  return task;
}

/**
 * Descarta la conexión en caché y borra el archivo `.db` del dispositivo.
 *
 * Si el borrado falla, la promesa se rechaza con `LocalCacheIsolationError`
 * y la base queda bloqueada: `getLocalDatabase` no la reabre hasta que un
 * reintento la borre (`PROJECT_RULES.md` §15).
 */
export function resetLocalDatabase(
  options: IsolationOptions = {},
): Promise<void> {
  // Una caché de propietario desconocido que no se pudo apartar nunca se
  // borra por una limpieza posterior: sigue bloqueada hasta aislarla.
  if (pendingIsolation?.kind === 'quarantine') {
    return Promise.reject(
      new LocalCacheIsolationError('quarantine_failed', {
        cause: pendingIsolation.cause,
      }),
    );
  }
  // Dos limpiezas simultáneas cerrarían la misma conexión dos veces; la
  // segunda espera a la primera en vez de abrir su propia carrera.
  if (resetPromise) return resetPromise.then(() => resetLocalDatabase(options));
  return runIsolation('discard', discardLocalDatabase, options);
}

/**
 * Aparta una caché cuyo propietario no puede demostrarse: la mueve a un
 * archivo propio que la app nunca abre como caché activa ni sube, y deja
 * `juntoss.db` libre para la sesión actual. No borra esos datos.
 */
export function quarantineLocalDatabase(
  options: IsolationOptions = {},
): Promise<string> {
  if (resetPromise) {
    return resetPromise.then(() => quarantineLocalDatabase(options));
  }
  return runIsolation('quarantine', quarantineDatabaseFile, options);
}

/**
 * Repite la limpieza que falló (borrado o aislamiento), sin cambiar su tipo:
 * una caché de propietario desconocido nunca pasa a borrarse por un
 * reintento. Devuelve la limpieza que terminó, o `null` si no había ninguna
 * o ya no aplica.
 *
 * Si la decidió la entrada de otra cuenta (`forUserId`) y ahora entra una
 * distinta, la decisión se descarta sin tocar la caché: quien llama la
 * vuelve a clasificar, porque podría ser justo de quien entra.
 */
export async function retryPendingLocalDatabaseIsolation(
  userId?: string,
): Promise<PendingIsolation['kind'] | null> {
  if (resetPromise) await resetPromise;
  const pending = pendingIsolation;
  if (!pending) return null;
  pendingIsolation = null;
  if (pending.forUserId && pending.forUserId !== userId) return null;
  const options = { forUserId: pending.forUserId };
  if (pending.kind === 'discard') await resetLocalDatabase(options);
  else await quarantineLocalDatabase(options);
  return pending.kind;
}
