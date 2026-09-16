import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  calculatePollingDelay,
  sharedDataMaxBackoffMs,
  sharedDataRefreshIntervalMs,
  useSharedDataPolling,
} from './useSharedDataPolling';
import { useNetworkAvailability } from '@/hooks/useNetworkAvailability';

jest.mock('@/hooks/useNetworkAvailability', () => ({
  useNetworkAvailability: jest.fn(),
}));

describe('useSharedDataPolling', () => {
  const mockUseNetwork = useNetworkAvailability as jest.Mock;
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseNetwork.mockReturnValue({ isOffline: false });
    (AppState as unknown as { currentState: AppStateStatus }).currentState =
      'active';
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener as (state: AppStateStatus) => void;
        return { remove: jest.fn() } as never;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calcula correctamente el backoff exponencial acotado al máximo', () => {
    expect(calculatePollingDelay(0)).toBe(2_000);
    expect(calculatePollingDelay(1)).toBe(4_000);
    expect(calculatePollingDelay(2)).toBe(8_000);
    expect(calculatePollingDelay(3)).toBe(16_000);
    expect(calculatePollingDelay(4)).toBe(32_000);
    expect(calculatePollingDelay(5)).toBe(64_000);
    expect(calculatePollingDelay(8)).toBe(sharedDataMaxBackoffMs);
    expect(calculatePollingDelay(10)).toBe(sharedDataMaxBackoffMs);
  });

  it('espera 2s tras activarse antes del primer tick', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    await renderHook(() => useSharedDataPolling({ enabled: true, onPoll }));

    expect(onPoll).not.toHaveBeenCalled();

    jest.advanceTimersByTime(sharedDataRefreshIntervalMs - 1);
    expect(onPoll).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(onPoll).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(sharedDataRefreshIntervalMs);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('aplica backoff exponencial ante fallos y se reinicia al tener éxito', async () => {
    const onPoll = jest
      .fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockResolvedValue(undefined);

    await renderHook(() => useSharedDataPolling({ enabled: true, onPoll }));

    // Primer tick en 2s (falla 1)
    await jest.advanceTimersByTimeAsync(2_000);
    expect(onPoll).toHaveBeenCalledTimes(1);

    // Siguiente tick en 4s (falla 2)
    await jest.advanceTimersByTimeAsync(4_000);
    expect(onPoll).toHaveBeenCalledTimes(2);

    // Siguiente tick en 8s (éxito)
    await jest.advanceTimersByTimeAsync(8_000);
    expect(onPoll).toHaveBeenCalledTimes(3);

    // Tras éxito vuelve a cadencia normal de 2s
    await jest.advanceTimersByTimeAsync(2_000);
    expect(onPoll).toHaveBeenCalledTimes(4);
  });

  it('se pausa cuando AppState pasa a background y ejecuta tick inmediato al volver a active', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    await renderHook(() => useSharedDataPolling({ enabled: true, onPoll }));

    // Avanza menos de un intervalo y pasa a background
    jest.advanceTimersByTime(1_000);
    appStateListener?.('background');

    // Pasan 30s en background sin polls
    jest.advanceTimersByTime(30_000);
    expect(onPoll).not.toHaveBeenCalled();

    // Vuelve a active → tick inmediato
    await appStateListener?.('active');
    expect(onPoll).toHaveBeenCalledTimes(1);

    // Y luego continúa a 2s
    await jest.advanceTimersByTimeAsync(2_000);
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it('se pausa cuando está offline y ejecuta tick inmediato al recuperar la red', async () => {
    const onPoll = jest.fn().mockResolvedValue(undefined);

    const { rerender } = await renderHook<void, { offline: boolean }>(
      ({ offline }: { offline: boolean }) => {
        mockUseNetwork.mockReturnValue({ isOffline: offline });
        return useSharedDataPolling({ enabled: true, onPoll });
      },
      { initialProps: { offline: false } },
    );

    // Pasa a offline
    rerender({ offline: true });
    await jest.advanceTimersByTimeAsync(30_000);
    expect(onPoll).not.toHaveBeenCalled();

    // Recupera conexión → tick inmediato
    rerender({ offline: false });
    await jest.advanceTimersByTimeAsync(0);
    expect(onPoll).toHaveBeenCalledTimes(1);
  });
});
