import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useNetworkAvailability } from '@/hooks/useNetworkAvailability';

const mockGetNetworkStateAsync = jest.fn();
let networkListener: ((state: object) => void) | null = null;
const mockRemove = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => mockGetNetworkStateAsync(),
  addNetworkStateListener: (listener: (state: object) => void) => {
    networkListener = listener;
    return { remove: mockRemove };
  },
}));

describe('useNetworkAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    networkListener = null;
    mockGetNetworkStateAsync.mockResolvedValue({ isInternetReachable: true });
  });

  it('empieza conectado y refleja la lectura inicial del sistema', async () => {
    mockGetNetworkStateAsync.mockResolvedValue({ isInternetReachable: false });

    const { result } = await renderHook(() => useNetworkAvailability());

    await waitFor(() => expect(result.current.isOffline).toBe(true));
  });

  it('sigue los cambios de conectividad y trata lo desconocido como conectado', async () => {
    const { result } = await renderHook(() => useNetworkAvailability());
    expect(result.current.isOffline).toBe(false);

    await act(async () => networkListener?.({ isInternetReachable: false }));
    expect(result.current.isOffline).toBe(true);

    await act(async () => networkListener?.({ isInternetReachable: null }));
    expect(result.current.isOffline).toBe(false);
  });

  it('se da de baja al desmontar', async () => {
    const { unmount } = await renderHook(() => useNetworkAvailability());

    await unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
