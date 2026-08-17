import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/supabaseCoupleSpaceSyncGateway';
import { syncCoupleSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';

jest.mock('@/lib/storage/localDatabase');
jest.mock('@/lib/storage/localIdentity');
jest.mock('@/features/sync/gateways/supabaseCoupleSpaceSyncGateway');

describe('syncCoupleSpaceDataForCurrentSession', () => {
  const getAllAsync = jest.fn();
  const runAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getLocalDatabase).mockResolvedValue({
      getAllAsync,
      runAsync,
    } as never);
    jest.mocked(getOrCreateInstallationId).mockResolvedValue('installation-a');
    jest.mocked(syncCoupleSpaceRemotely).mockResolvedValue();
    runAsync.mockResolvedValue({ changes: 1 });
  });

  it('publica el lote del espacio y solo entonces marca sus filas como sincronizadas', async () => {
    getAllAsync
      .mockResolvedValueOnce([
        {
          id: 'category-a',
          name: 'Casa',
          icon: 'home',
          colorToken: 'blue',
          budgetMinor: null,
          isDefault: 0,
          templateKey: null,
          isArchived: 0,
          createdAt: '2026-08-13T10:00:00.000Z',
          updated_at: '2026-08-13T10:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'money-account-a',
          name: 'Cuenta nómina',
          kind: 'bank',
          icon: 'bank',
          colorToken: 'blue',
          currency: 'EUR',
          openingBalanceMinor: 100000,
          isArchived: 0,
          createdAt: '2026-08-13T09:00:00.000Z',
          updated_at: '2026-08-13T09:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'transaction-a',
          moneyAccountId: 'money-account-a',
          categoryId: 'category-a',
          type: 'expense',
          amountMinor: 2450,
          currency: 'EUR',
          title: 'Compra',
          occurredOn: '2026-08-13',
          recurrence: 'once',
          recurrenceGroupId: null,
          recurrenceSeriesId: null,
          sourceTransactionId: null,
          isArchived: 0,
          createdAt: '2026-08-13T10:01:00.000Z',
          updated_at: '2026-08-13T10:01:00.000Z',
        },
      ]);

    await syncCoupleSpaceDataForCurrentSession({ spaceId: 'couple-a' });

    expect(syncCoupleSpaceRemotely).toHaveBeenCalledWith({
      installationId: 'installation-a',
      spaceId: 'couple-a',
      categories: [
        expect.objectContaining({
          id: 'category-a',
          remoteId: 'category-a',
          isDefault: false,
          isArchived: false,
        }),
      ],
      moneyAccounts: [
        expect.objectContaining({
          id: 'money-account-a',
          remoteId: 'money-account-a',
          currency: 'EUR',
          openingBalanceMinor: 100000,
          isArchived: false,
        }),
      ],
      recurringSeries: [],
      transactions: [
        expect.objectContaining({
          id: 'transaction-a',
          categoryId: 'category-a',
          moneyAccountId: 'money-account-a',
          remoteId: 'transaction-a',
          isArchived: false,
        }),
      ],
    });
    expect(runAsync).toHaveBeenCalledTimes(3);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE money_accounts'),
      'money-account-a',
      '2026-08-13T09:00:00.000Z',
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("SET sync_status = 'synced'"),
      'category-a',
      '2026-08-13T10:00:00.000Z',
    );
  });

  it('no llama a Supabase cuando no hay cambios locales del espacio', async () => {
    getAllAsync.mockResolvedValue([]);

    await expect(
      syncCoupleSpaceDataForCurrentSession({ spaceId: 'couple-empty' }),
    ).resolves.toEqual({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 0,
    });

    expect(syncCoupleSpaceRemotely).not.toHaveBeenCalled();
    expect(runAsync).not.toHaveBeenCalled();
  });
});
