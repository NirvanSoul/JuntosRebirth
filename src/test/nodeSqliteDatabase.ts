import type { SQLiteDatabase } from 'expo-sqlite';

type SqlValue = string | number | null | Uint8Array;
type StatementSync = {
  all: (...params: SqlValue[]) => Record<string, unknown>[];
  get: (...params: SqlValue[]) => Record<string, unknown> | undefined;
  run: (...params: SqlValue[]) => {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
};
type DatabaseSync = {
  exec: (source: string) => void;
  prepare: (source: string) => StatementSync;
  close: () => void;
};

/**
 * Base SQLite real en memoria para las pruebas de persistencia.
 *
 * Usa `node:sqlite` (Node ≥ 22) y expone el subconjunto de `SQLiteDatabase`
 * de Expo que usan los repositorios y las migraciones. Así una prueba ejecuta
 * el esquema y las consultas reales, incluidos `ON CONFLICT … WHERE` y el
 * `ROLLBACK` de una transacción, en vez de un doble que solo recuerda llamadas.
 */
export function createNodeSqliteDatabase(path = ':memory:'): SQLiteDatabase & {
  close: () => void;
  native: unknown;
} {
  // `require` diferido: el módulo solo existe en Node, nunca en el bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (path: string) => DatabaseSync;
  };
  const native = new DatabaseSync(path);
  const normalize = (params: unknown[]): SqlValue[] =>
    (params.length === 1 && Array.isArray(params[0])
      ? (params[0] as unknown[])
      : params
    ).map((value) =>
      typeof value === 'boolean' ? (value ? 1 : 0) : (value as SqlValue),
    );
  const toNumber = (value: number | bigint) => Number(value);

  // Expo ejecuta `withExclusiveTransactionAsync` en otra conexión: la
  // transacción recibe su propio objeto, nunca el que `localDatabase.ts`
  // envuelve con la cola de escrituras.
  const createExecutor = () => ({
    execAsync: async (source: string) => {
      native.exec(source);
    },
    getAllAsync: async (source: string, ...params: unknown[]) =>
      native.prepare(source).all(...normalize(params)),
    getFirstAsync: async (source: string, ...params: unknown[]) =>
      native.prepare(source).get(...normalize(params)) ?? null,
    runAsync: async (source: string, ...params: unknown[]) => {
      const result = native.prepare(source).run(...normalize(params));
      return {
        changes: toNumber(result.changes),
        lastInsertRowId: toNumber(result.lastInsertRowid),
      };
    },
  });

  const database = {
    ...createExecutor(),
    databasePath: path,
    native,
    withTransactionAsync: async (task: () => Promise<void>) => {
      native.exec('BEGIN');
      try {
        await task();
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    withExclusiveTransactionAsync: async (
      task: (transaction: SQLiteDatabase) => Promise<void>,
    ) => {
      native.exec('BEGIN EXCLUSIVE');
      try {
        await task(createExecutor() as unknown as SQLiteDatabase);
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    closeAsync: async () => native.close(),
    close: () => native.close(),
  };
  return database as unknown as SQLiteDatabase & {
    close: () => void;
    native: unknown;
  };
}

type NodeFiles = {
  createTemporaryDirectory: () => string;
  join: (directory: string, name: string) => string;
  exists: (file: string) => boolean;
  list: (directory: string) => string[];
  remove: (file: string) => void;
};

/**
 * Archivos reales para simular el directorio de bases de SQLite: borrar,
 * copiar y reabrir la caché ocurren de verdad en un directorio temporal.
 */
export function createNodeFiles(): NodeFiles {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const fs = require('node:fs') as {
    mkdtempSync: (prefix: string) => string;
    existsSync: (file: string) => boolean;
    readdirSync: (directory: string) => string[];
    rmSync: (file: string, options?: object) => void;
  };
  const os = require('node:os') as { tmpdir: () => string };
  const path = require('node:path') as {
    join: (...parts: string[]) => string;
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    createTemporaryDirectory: () =>
      fs.mkdtempSync(path.join(os.tmpdir(), 'juntoss-')),
    join: (directory, name) => path.join(directory, name),
    exists: (file) => fs.existsSync(file),
    list: (directory) => fs.readdirSync(directory),
    remove: (file) => fs.rmSync(file, { recursive: true, force: true }),
  };
}
