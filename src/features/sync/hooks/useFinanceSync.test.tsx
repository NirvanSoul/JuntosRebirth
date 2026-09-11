import { renderHook, act } from '@testing-library/react-native';
import { useFinanceSync } from './useFinanceSync';
import { restoreRemoteAccountForCurrentSession } from '@/features/sync/services/restoreRemoteAccount';
import { listLocalTransactions } from '@/features/transactions/repositories/localTransactionRepository';
import type { BetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';

jest.mock('@/features/sync/services/restoreRemoteAccount', () => ({
  restoreRemoteAccountForCurrentSession: jest.fn(),
}));

jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  listLocalCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock(
  '@/features/accounts/repositories/localMoneyAccountRepository',
  () => ({
    listLocalMoneyAccounts: jest.fn().mockResolvedValue([]),
  }),
);
jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    listLocalTransactions: jest.fn().mockResolvedValue([]),
  }),
);
jest.mock('@/features/sync/services/syncCoupleSpaceData', () => ({
  syncSpaceDataForCurrentSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/transactions/services/notificationRuleService', () => ({
  reconcileNotificationRules: jest.fn().mockResolvedValue(undefined),
}));

describe('useFinanceSync', () => {
  const mockRestore = restoreRemoteAccountForCurrentSession as jest.Mock;
  const mockReloadSpaces = jest.fn().mockResolvedValue(undefined);
  const mockSetCategories = jest.fn();
  const mockSetMoneyAccounts = jest.fn();
  const mockSetTransactions = jest.fn();

  const session: BetterAuthSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      emailVerified: true,
      name: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: 'test-session-id',
      userId: 'test-user-id',
      token: 'test-token',
      expiresAt: new Date(Date.now() + 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delta con 0 filas recibidas no recarga finanzas locales', async () => {
    mockRestore.mockResolvedValue({
      spaces: [],
      localCategoryIdByRemoteId: new Map(),
      localSpaceIdByRemoteId: new Map(),
      outcome: {
        mode: 'delta',
        receivedRows: 0,
        catalogueChanged: false,
      },
    });

    const { result } = await renderHook(() =>
      useFinanceSync({
        refreshCoupleSpace: jest.fn(),
        reloadCurrencyPreferences: jest.fn(),
        reloadSpaces: mockReloadSpaces,
        session,
        setCategories: mockSetCategories,
        setMoneyAccounts: mockSetMoneyAccounts,
        setTransactions: mockSetTransactions,
        spaces: [],
      }),
    );

    await act(async () => {
      await result.current.refreshSharedCoupleData(undefined, {
        mode: 'delta',
      });
    });

    expect(mockRestore).toHaveBeenCalledWith({ mode: 'delta' });
    expect(listLocalTransactions).not.toHaveBeenCalled();
    expect(mockSetTransactions).not.toHaveBeenCalled();
    expect(mockReloadSpaces).not.toHaveBeenCalled();
  });

  it('delta con catalogueChanged llama a reloadSpaces', async () => {
    mockRestore.mockResolvedValue({
      spaces: [],
      localCategoryIdByRemoteId: new Map(),
      localSpaceIdByRemoteId: new Map(),
      outcome: {
        mode: 'delta',
        receivedRows: 0,
        catalogueChanged: true,
      },
    });

    const { result } = await renderHook(() =>
      useFinanceSync({
        refreshCoupleSpace: jest.fn(),
        reloadCurrencyPreferences: jest.fn(),
        reloadSpaces: mockReloadSpaces,
        session,
        setCategories: mockSetCategories,
        setMoneyAccounts: mockSetMoneyAccounts,
        setTransactions: mockSetTransactions,
        spaces: [],
      }),
    );

    await act(async () => {
      await result.current.refreshSharedCoupleData(undefined, {
        mode: 'delta',
      });
    });

    expect(mockReloadSpaces).toHaveBeenCalledTimes(1);
    expect(mockSetTransactions).not.toHaveBeenCalled();
  });

  it('modo full siempre recarga finanzas locales aunque receivedRows sea 0', async () => {
    mockRestore.mockResolvedValue({
      spaces: [],
      localCategoryIdByRemoteId: new Map(),
      localSpaceIdByRemoteId: new Map(),
      outcome: {
        mode: 'full',
        receivedRows: 0,
        catalogueChanged: false,
      },
    });

    const { result } = await renderHook(() =>
      useFinanceSync({
        refreshCoupleSpace: jest.fn(),
        reloadCurrencyPreferences: jest.fn(),
        reloadSpaces: mockReloadSpaces,
        session,
        setCategories: mockSetCategories,
        setMoneyAccounts: mockSetMoneyAccounts,
        setTransactions: mockSetTransactions,
        spaces: [],
      }),
    );

    await act(async () => {
      await result.current.refreshSharedCoupleData();
    });

    expect(mockRestore).toHaveBeenCalledWith({ mode: 'full' });
    expect(listLocalTransactions).toHaveBeenCalledTimes(1);
    expect(mockSetTransactions).toHaveBeenCalledTimes(1);
  });
});
