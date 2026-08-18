import type { SQLiteDatabase } from 'expo-sqlite';

import {
  GuestDataAccountMismatchError,
  GuestDataOwnershipConfirmationRequiredError,
  completeLocalGuestMigration,
  failLocalGuestMigration,
  prepareLocalGuestMigration,
} from '@/features/sync/repositories/localGuestMigrationRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));
jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000099'),
}));

describe('localGuestMigrationRepository', () => {
  const getFirstAsync = jest.fn();
  const getAllAsync = jest.fn();
  const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
  const database = {
    getFirstAsync,
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync: jest.fn(async (task) => task(database)),
  } as unknown as SQLiteDatabase;
  const spaces = [
    { id: 'personal', name: 'Personal', type: 'personal', currency: 'EUR' },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocalDatabase.mockResolvedValue(database);
  });

  it('exige confirmación antes de asociar los datos a la primera cuenta', async () => {
    getFirstAsync.mockResolvedValueOnce(null);
    await expect(
      prepareLocalGuestMigration(spaces, 'user-1', false),
    ).rejects.toBeInstanceOf(GuestDataOwnershipConfirmationRequiredError);
    expect(getAllAsync).not.toHaveBeenCalled();
  });

  it('impide mezclar el dispositivo con una cuenta distinta', async () => {
    getFirstAsync.mockResolvedValueOnce({ user_id: 'user-1' });
    await expect(
      prepareLocalGuestMigration(spaces, 'user-2', true),
    ).rejects.toBeInstanceOf(GuestDataAccountMismatchError);
  });

  it('exporta relaciones, recurrencias y fechas técnicas en un lote estable', async () => {
    getFirstAsync.mockResolvedValueOnce(null);
    getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'category-1',
          space_id: 'personal',
          name: 'Casa',
          icon: 'house',
          color_token: 'slate',
          budget_minor: 50_000,
          is_default: 0,
          template_key: null,
          source_category_id: null,
          is_archived: 0,
          created_at: '2026-08-01T10:00:00.000Z',
          updated_at: '2026-08-01T10:00:00.000Z',
          archived_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'money-account-1',
          space_id: 'personal',
          name: 'Cuenta nómina',
          kind: 'bank',
          icon: 'bank',
          color_token: 'blue',
          currency: 'EUR',
          opening_balance_minor: 100_000,
          is_archived: 0,
          created_at: '2026-08-01T09:00:00.000Z',
          updated_at: '2026-08-01T09:00:00.000Z',
          archived_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          money_account_id: 'money-account-1',
          currency: 'EUR',
          opening_balance_minor: 100_000,
          position: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'series-1',
          space_id: 'personal',
          category_id: 'category-1',
          money_account_id: 'money-account-1',
          type: 'expense',
          amount_minor: 1250,
          currency: 'EUR',
          title: 'Compra',
          frequency: 'monthly',
          starts_on: '2026-08-01',
          generated_occurrences: 1,
          next_occurrence_on: '2026-09-01',
          is_archived: 0,
          created_at: '2026-08-01T10:00:00.000Z',
          updated_at: '2026-08-01T10:00:00.000Z',
          archived_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'transaction-1',
          space_id: 'personal',
          category_id: 'category-1',
          money_account_id: 'money-account-1',
          type: 'expense',
          amount_minor: 1250,
          currency: 'EUR',
          title: 'Compra',
          occurred_on: '2026-08-01',
          recurrence: 'monthly',
          recurrence_group_id: null,
          recurrence_series_id: 'series-1',
          source_transaction_id: null,
          is_archived: 0,
          created_at: '2026-08-01T10:00:00.000Z',
          updated_at: '2026-08-01T10:00:00.000Z',
          archived_at: null,
        },
      ]);

    const payload = await prepareLocalGuestMigration(spaces, 'user-1', true);

    expect(payload).toMatchObject({
      installationId: 'installation-id',
      userId: 'user-1',
      spaces,
      categories: [{ id: 'category-1', spaceId: 'personal' }],
      recurringSeries: [
        {
          id: 'series-1',
          categoryId: 'category-1',
          startsOn: '2026-08-01',
          nextOccurrenceOn: '2026-09-01',
        },
      ],
      transactions: [
        {
          id: 'transaction-1',
          spaceId: 'personal',
          categoryId: 'category-1',
          occurredOn: '2026-08-01',
          recurrenceSeriesId: 'series-1',
        },
      ],
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_sync_account'),
      'user-1',
      expect.any(String),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE categories SET sync_status = ?'),
      'syncing',
      'category-1',
    );

    await completeLocalGuestMigration(payload);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("updated_at = ? AND sync_status = 'syncing'"),
      'transaction-1',
      '2026-08-01T10:00:00.000Z',
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'completed'"),
      expect.any(String),
      expect.any(String),
      payload.batchId,
      'user-1',
    );

    await failLocalGuestMigration(payload);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("AND sync_status = 'syncing'"),
      'failed',
      'transaction-1',
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'failed'"),
      expect.any(String),
      payload.batchId,
      'user-1',
    );
  });

  it('rechaza una fila financiera cuyo espacio no está en el catálogo', async () => {
    getFirstAsync.mockResolvedValueOnce({ user_id: 'user-1' });
    getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'category-1',
          space_id: 'missing-space',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      prepareLocalGuestMigration(spaces, 'user-1', false),
    ).rejects.toThrow('Falta el espacio local missing-space');
  });
});
