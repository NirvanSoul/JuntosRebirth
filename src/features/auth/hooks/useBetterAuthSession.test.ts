import { renderHook } from '@testing-library/react-native';

import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';

const mockUseSession = jest.fn();

jest.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => mockUseSession() },
}));

const verifiedSession = {
  user: { id: 'user-ana', email: 'ana@ejemplo.com', emailVerified: true },
  session: { id: 'session-1', expiresAt: new Date(Date.now() + 60_000) },
};

describe('useBetterAuthSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no está lista mientras la primera lectura no tiene sesión', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: true,
    });

    const { result } = await renderHook(() => useBetterAuthSession());

    expect(result.current).toEqual({
      error: null,
      isReady: false,
      session: null,
    });
  });

  it('abre con la sesión hidratada desde el dispositivo sin esperar a la red', async () => {
    // El cliente Expo rellena `data` desde SecureStore antes de que responda
    // `/get-session`; `isPending` sigue en `true` hasta entonces.
    mockUseSession.mockReturnValue({
      data: verifiedSession,
      error: null,
      isPending: true,
    });

    const { result } = await renderHook(() => useBetterAuthSession());

    expect(result.current.isReady).toBe(true);
    expect(result.current.session).toBe(verifiedSession);
  });

  it('queda lista y sin sesión cuando el servidor la niega', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: false,
    });

    const { result } = await renderHook(() => useBetterAuthSession());

    expect(result.current).toEqual({
      error: null,
      isReady: true,
      session: null,
    });
  });
});
