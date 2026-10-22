import { renderHook } from '@testing-library/react-native';

import { useBetterAuthSession } from '@/features/auth/hooks/useBetterAuthSession';
import {
  resetDemoSessionStoreForTests,
  saveDemoSession,
} from '@/state/demoSession/demoSessionStore';

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

  it('mantiene listo el acceso durante un refresco sin sesión al volver a primer plano', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: true,
    });

    const { rerender, result } = await renderHook(
      ({ renderKey }: { renderKey: number }) => {
        void renderKey;
        return useBetterAuthSession();
      },
      { initialProps: { renderKey: 0 } },
    );
    expect(result.current.isReady).toBe(false);

    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: false,
    });
    await rerender({ renderKey: 1 });
    expect(result.current.isReady).toBe(true);

    // iOS pasa por inactive/active al autorizar el autocompletado con Face ID.
    // Better Auth refresca entonces una sesión todavía anónima y no debe
    // desmontar el formulario que acaba de recibir las credenciales.
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: true,
    });
    await rerender({ renderKey: 2 });

    expect(result.current).toEqual({
      error: null,
      isReady: true,
      session: null,
    });
  });

  it('abre la sesión verificada del usuario demo en lugar de la real', async () => {
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: false,
    });
    await saveDemoSession({
      userId: 'demo-self',
      displayName: 'Angélica',
      email: 'angelica@demo.juntoss.invalid',
      partnerUserId: 'demo-partner',
      partnerDisplayName: 'Manuel',
      currency: 'EUR',
      createdAt: '2026-10-17T10:00:00.000Z',
      previousCurrencyPreferences: null,
    });

    try {
      const { result } = await renderHook(() => useBetterAuthSession());

      expect(result.current.isReady).toBe(true);
      expect(result.current.session?.user).toMatchObject({
        id: 'demo-self',
        emailVerified: true,
        name: 'Angélica',
      });
    } finally {
      resetDemoSessionStoreForTests();
    }
  });
});
