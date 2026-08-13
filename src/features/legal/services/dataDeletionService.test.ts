import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteLocalData,
  deleteMyAccountOrData,
} from '@/features/legal/services/dataDeletionService';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();
const mockResetLocalDatabase = jest.fn<Promise<void>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
  resetLocalDatabase: () => mockResetLocalDatabase(),
}));

describe('dataDeletionService', () => {
  const execAsync = jest.fn<Promise<void>, [string]>(async () => undefined);
  const database = {
    execAsync,
    withExclusiveTransactionAsync: jest.fn(async (task) => task(database)),
  } as unknown as SQLiteDatabase;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
    mockResetLocalDatabase.mockResolvedValue(undefined);
    await AsyncStorage.clear();
  });

  it('borra las tablas locales dentro de una transacción exclusiva', async () => {
    await deleteLocalData();

    expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(execAsync).toHaveBeenCalledTimes(1);
    const statement = execAsync.mock.calls[0]?.[0] ?? '';
    for (const table of [
      'transaction_notification_rule_schedules',
      'transaction_notification_rules',
      'transaction_reminders',
      'merchant_feedback_queue',
      'import_items',
      'import_batches',
      'import_merchant_rules',
      'category_budgets',
      'transactions',
      'recurring_transaction_series',
      'categories',
      'local_sync_batches',
      'local_sync_account',
      'local_profile',
      'remote_entity_links',
      'local_metadata',
    ]) {
      expect(statement).toContain(`DELETE FROM ${table}`);
    }
    expect(mockResetLocalDatabase).not.toHaveBeenCalled();
  });

  it('recurre a borrar el archivo de la base si no se puede abrir o vaciar', async () => {
    mockGetLocalDatabase.mockRejectedValue(new Error('base corrupta'));
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await expect(deleteLocalData()).resolves.toBeUndefined();

    expect(mockResetLocalDatabase).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      '[dataDeletionService]',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });

  it('borra solo las claves de AsyncStorage del espacio de nombres de la app', async () => {
    await AsyncStorage.setItem('@juntoss/spaces/v1', '{}');
    await AsyncStorage.setItem(
      '@juntoss/notification-privacy/show-amounts/v1',
      'false',
    );
    await AsyncStorage.setItem('unrelated-key', 'keep-me');

    await deleteLocalData();

    expect(await AsyncStorage.getItem('@juntoss/spaces/v1')).toBeNull();
    expect(
      await AsyncStorage.getItem(
        '@juntoss/notification-privacy/show-amounts/v1',
      ),
    ).toBeNull();
    expect(await AsyncStorage.getItem('unrelated-key')).toBe('keep-me');
  });

  it('borra solo los datos locales cuando no hay sesión configurada', async () => {
    const result = await deleteMyAccountOrData();

    expect(result).toEqual({ scope: 'local' });
    expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
  });
});
