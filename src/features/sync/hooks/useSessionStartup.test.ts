import { act, renderHook, waitFor } from '@testing-library/react-native';

import { initializeAuthenticatedSession } from '@/features/auth/services/sessionInitialization';
import { announceLocalProfileReplaced } from '@/features/profile/repositories/localProfileRepository';
import { useSessionStartup } from '@/features/sync/hooks/useSessionStartup';
import { LocalCacheIsolationError } from '@/lib/storage/localCacheIsolationError';
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
jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  announceLocalProfileReplaced: jest.fn(async () => undefined),
}));
jest.mock(
  '@/features/transactions/repositories/localTransactionNotificationRuleRepository',
  () => ({ listLocalNotificationRules: jest.fn(async () => []) }),
);

type TestSession = NonNullable<
  Parameters<typeof useSessionStartup>[0]['session']
>;

const session: TestSession = {
  user: { id: 'user-1', email: 'ana@ejemplo.com', emailVerified: true },
} as unknown as TestSession;

function startupInput() {
  return {
    refreshSharedCoupleData: jest.fn(async () => undefined),
    reloadLocalFinance: jest.fn(async () => undefined),
    reloadCurrencyPreferences: jest.fn(async () => undefined),
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

  it('bloquea sin leer la caché si no se pudo aislar, y la muestra tras reintentar', async () => {
    (initializeAuthenticatedSession as jest.Mock).mockRejectedValueOnce(
      new LocalCacheIsolationError('discard_failed'),
    );

    const input = startupInput();
    const { result } = await renderHook(() => useSessionStartup(input));

    await waitFor(() => expect(result.current.isLocalCacheBlocked).toBe(true));
    // Ni siquiera un instante: la caché de la cuenta anterior no se lee.
    expect(input.reloadLocalFinance).not.toHaveBeenCalled();
    expect(result.current.syncIssue).toBeNull();

    let finishRetry: () => void = () => undefined;
    (initializeAuthenticatedSession as jest.Mock).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishRetry = resolve;
        }),
    );
    await act(async () => result.current.retryLocalCache());

    // Mientras el reintento sigue, se ve la carga: ni el bloqueo ni la
    // navegación con una caché todavía sin aislar.
    expect(result.current.isLocalCacheBlocked).toBe(false);
    expect(result.current.isFinanceReady).toBe(false);

    await act(async () => finishRetry());
    await waitFor(() => expect(result.current.isFinanceReady).toBe(true));
    expect(input.reloadLocalFinance).toHaveBeenCalled();
  });

  it('tras descartar la caché de otra cuenta relee lo cargado al montar aunque falle el snapshot', async () => {
    (initializeAuthenticatedSession as jest.Mock).mockImplementationOnce(
      async (options: {
        onLocalCacheReady: (preparation: 'discarded') => void;
      }) => {
        options.onLocalCacheReady('discarded');
        throw new ApiError({ status: 503, code: 'UNAVAILABLE', message: 'x' });
      },
    );

    const input = startupInput();
    const { result } = await renderHook(() => useSessionStartup(input));

    await waitFor(() => expect(result.current.isFinanceReady).toBe(true));
    // Espacios, monedas y perfil propio se releen de la caché nueva antes de
    // mostrar nada, aunque el snapshot no llegue.
    expect(input.reloadSpaces).toHaveBeenCalled();
    expect(input.reloadCurrencyPreferences).toHaveBeenCalled();
    expect(announceLocalProfileReplaced).toHaveBeenCalled();
    expect(input.reloadSpaces.mock.invocationCallOrder[0]).toBeLessThan(
      input.reloadLocalFinance.mock.invocationCallOrder[0]!,
    );
  });

  it('no reinicializa si cambia la referencia de la misma cuenta', async () => {
    const input = startupInput();
    const { rerender } = await renderHook<
      ReturnType<typeof useSessionStartup>,
      { currentSession: TestSession }
    >(
      ({ currentSession }) =>
        useSessionStartup({ ...input, session: currentSession }),
      { initialProps: { currentSession: session } },
    );
    await waitFor(() =>
      expect(initializeAuthenticatedSession).toHaveBeenCalledTimes(1),
    );

    await rerender({
      currentSession: {
        ...session,
        user: { ...session!.user },
      },
    });

    expect(initializeAuthenticatedSession).toHaveBeenCalledTimes(1);
  });
});
