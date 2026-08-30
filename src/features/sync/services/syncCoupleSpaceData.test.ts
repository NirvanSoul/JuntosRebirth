import { getOrCreateInstallationId } from '@/lib/storage/localIdentity';
import { getLocalDatabase } from '@/lib/storage/localDatabase';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import { syncCoupleSpaceRemotely } from '@/features/sync/gateways/juntossCoupleSpaceSyncGateway';
import { findRemoteIdForLocalEntity } from '@/features/sync/repositories/localRemoteEntityLinkRepository';
import { syncSpaceDataForCurrentSession } from '@/features/sync/services/syncCoupleSpaceData';

jest.mock('@/lib/storage/localDatabase');
jest.mock('@/lib/storage/localIdentity');
jest.mock('@/features/sync/gateways/juntossCoupleSpaceSyncGateway');
jest.mock('@/features/legal/services/authenticatedUser');
jest.mock('@/features/sync/repositories/localRemoteEntityLinkRepository');

describe('syncSpaceDataForCurrentSession', () => {
  const getAllAsync = jest.fn();
  const runAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getLocalDatabase).mockResolvedValue({
      getAllAsync,
      runAsync,
    } as never);
    jest.mocked(getOrCreateInstallationId).mockResolvedValue('installation-a');
    jest.mocked(getAuthenticatedUserId).mockResolvedValue('user-ana');
    jest.mocked(findRemoteIdForLocalEntity).mockResolvedValue(null);
    jest.mocked(syncCoupleSpaceRemotely).mockResolvedValue({
      categoryCount: 0,
      moneyAccountCount: 0,
      recurringSeriesCount: 0,
      transactionCount: 0,
    });
    runAsync.mockResolvedValue({ changes: 1 });
  });

  it('publica el lote del espacio y solo entonces marca sus filas como sincronizadas', async () => {
    jest
      .mocked(findRemoteIdForLocalEntity)
      .mockResolvedValue('remote-couple-a');
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
          category_id: 'category-a',
          currency: 'EUR',
          budgetAmountMinor: 30000,
        },
        {
          category_id: 'category-a',
          currency: 'VES',
          budgetAmountMinor: 900000,
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
          isArchived: 0,
          createdAt: '2026-08-13T09:00:00.000Z',
          updated_at: '2026-08-13T09:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          money_account_id: 'money-account-a',
          currency: 'EUR',
          openingBalanceMinor: 100000,
          position: 0,
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
          note: 'Regalo de Ana',
          recurrence: 'once',
          recurrenceGroupId: null,
          recurrenceSeriesId: null,
          sourceTransactionId: null,
          isArchived: 0,
          createdAt: '2026-08-13T10:01:00.000Z',
          updated_at: '2026-08-13T10:01:00.000Z',
        },
      ]);

    await syncSpaceDataForCurrentSession({ spaceId: 'couple-a' });

    expect(syncCoupleSpaceRemotely).toHaveBeenCalledWith({
      installationId: 'installation-a',
      spaceId: 'remote-couple-a',
      categories: [
        expect.objectContaining({
          id: 'category-a',
          remoteId: 'category-a',
          isDefault: false,
          isArchived: false,
          // Los presupuestos por moneda viajan con su categoría: hasta ahora
          // no salían nunca del dispositivo y se perdían al cambiar de móvil.
          budgets: [
            { currency: 'EUR', budgetAmountMinor: 30000 },
            { currency: 'VES', budgetAmountMinor: 900000 },
          ],
        }),
      ],
      moneyAccounts: [
        expect.objectContaining({
          id: 'money-account-a',
          remoteId: 'money-account-a',
          currency: 'EUR',
          isArchived: false,
          balances: [
            { currency: 'EUR', openingBalanceMinor: 100000, position: 0 },
          ],
        }),
      ],
      recurringSeries: [],
      transactions: [
        expect.objectContaining({
          id: 'transaction-a',
          categoryId: 'category-a',
          moneyAccountId: 'money-account-a',
          remoteId: 'transaction-a',
          // La nota se quedaba en el móvil: el backend la acepta y la
          // devuelve, pero el cliente no la enviaba.
          note: 'Regalo de Ana',
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

  it('no llama a la API cuando no hay cambios locales del espacio', async () => {
    getAllAsync.mockResolvedValue([]);

    await expect(
      syncSpaceDataForCurrentSession({ spaceId: 'couple-empty' }),
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
