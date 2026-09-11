import type { SQLiteDatabase } from 'expo-sqlite';

export type LocalSqlExecutor = Pick<
  SQLiteDatabase,
  'getAllAsync' | 'getFirstAsync' | 'runAsync'
>;
