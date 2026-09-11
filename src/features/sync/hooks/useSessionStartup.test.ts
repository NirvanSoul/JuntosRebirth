import { act, renderHook, waitFor } from '@testing-library/react-native';

import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import { useSessionStartup } from '@/features/sync/hooks/useSessionStartup';
import { ApiError } from '@/services/api/client';

let mockIsOffline = false;
jest.mock('@/hooks/useNetworkAvailability', () => ({
  useNetworkAvailability: () => ({ isOffline: mockIsOffline }),
}));
jest.mock('@/features/auth/services/sessionInitialization', () => ({
  initializeAuthenticatedSession: jest.fn(async () => undefined),
}));
jest.mock('@/features/auth/services/expiredSession', () => ({
  ...jest.requireActual('@/features/auth/services/expiredSession'),
  endExpiredSession: jest.fn(async () => true),
}));
jest.mock(
  '@/features/transactions/repositories/localTransactionNotificationRuleRepository',
  () => ({ listLocalNotificationRules: jest.fn(async () => []) }),
);

const session = {
  user: { id: 'user-1', email: 'ana@ejemplo.com', emailVerified: true },
} as unknown as Parameters<typeof useSessionStartup>[0]['session'];

function startupInput() {
  return {
    refreshSharedCoupleData: jest.fn(async () => undefined),
    reloadLocalFinance: jest.fn(async () => undefined),
    reloadSpaces: jest.fn(async () => undefined),
    session,
    setNotificationRules: jest.fn(),
  };
}

const offlineError = () =>
  new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'sin red' });

describe('useSessionStartup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockIsOffline = false;
  });
  afterEach(() => jest.restoreAllMocks());

  it('expone un aviso sin conexión y lo retira al reintentar con éxito', async () => {
    (initializeAuthenticatedSession as jest.Mock).mockRejectedValueOnce(
      offlineError(),
    );

    const input = startupInput();
    const { result } = await renderHook(() => useSessionStartup(input));

    await waitFor(() => expect(result.current.syncIssue?.kind).toBe('offline'));
    expect(result.current.isFinanceReady).toBe(true);

    await act(async () => result.current.retrySession());

    await waitFor(() =>
      expect(initializeAuthenticatedSession).toHaveBeenCalledTimes(2),
    );
    expect(result.current.syncIssue).toBeNull();
  });

  it('reintenta por sí solo al recuperar la conexión', async () => {
    mockIsOffline = true;
    (initializeAuthenticatedSession as jest.Mock).mockRejectedValueOnce(
      offlineError(),
    );

    const input = startupInput();
    const { result, rerender } = await renderHook(() =>
      useSessionStartup(input),
    );
    await waitFor(() => expect(result.current.syncIssue?.kind).toBe('offline'));

    mockIsOffline = false;
    await rerender({});

    await waitFor(() =>
      expect(initializeAuthenticatedSession).toHaveBeenCalledTimes(2),
    );
    await waitFor(() => expect(result.current.syncIssue).toBeNull());
  });

  it('no reintenta al reconectar si el fallo no fue de conexión', async () => {
    mockIsOffline = true;
    (initializeAuthenticatedSession as jest.Mock).mockRejectedValueOnce(
      new ApiError({ status: 503, code: 'UNAVAILABLE', message: 'x' }),
    );

    const input = startupInput();
    const { result, rerender } = await renderHook(() =>
      useSessionStartup(input),
    );
    await waitFor(() =>
      expect(result.current.syncIssue?.kind).toBe('recoverable'),
    );

    mockIsOffline = false;
    await rerender({});

    expect(initializeAuthenticatedSession).toHaveBeenCalledTimes(1);
    expect(result.current.syncIssue?.kind).toBe('recoverable');

    await act(async () =>
      result.current.dismissSyncIssue(result.current.syncIssue!.id),
    );
    expect(result.current.syncIssue).toBeNull();
  });
});
