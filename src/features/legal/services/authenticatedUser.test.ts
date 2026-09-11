import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';

const mockGetSession = jest.fn();
const mockReadCachedSession = jest.fn();

jest.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: () => mockGetSession(),
    $store: { atoms: { session: { get: () => mockReadCachedSession() } } },
  },
}));

describe('getAuthenticatedUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadCachedSession.mockReturnValue({ data: null, error: null });
  });

  it('devuelve el uuid que responde el servidor', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-ana' } },
      error: null,
    });

    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('devuelve null cuando el servidor confirma que ya no hay sesión', async () => {
    // La caché todavía recuerda a quien acaba de salir; el servidor manda.
    mockReadCachedSession.mockReturnValue({
      data: { user: { id: 'user-ana' } },
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: null, error: null });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });

  it('devuelve null ante un 401 aunque la caché conserve la sesión anterior', async () => {
    mockReadCachedSession.mockReturnValue({
      data: { user: { id: 'user-ana' } },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: 'Unauthorized' },
    });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });

  it('usa la sesión en caché cuando la petición de sesión falla por red', async () => {
    mockReadCachedSession.mockReturnValue({
      data: { user: { id: 'user-ana' } },
      error: null,
    });
    mockGetSession.mockRejectedValue(new Error('Network request failed'));

    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
  });

  it('usa la sesión en caché cuando el servidor falla sin negar la sesión', async () => {
    mockReadCachedSession.mockReturnValue({
      data: { user: { id: 'user-ana' } },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: null,
      error: { status: 503, statusText: 'Service Unavailable' },
    });

    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
  });

  it('devuelve null si ni el servidor ni la caché tienen una sesión', async () => {
    mockGetSession.mockRejectedValue(new Error('Network request failed'));

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });

  it('ignora una caché con una forma inesperada', async () => {
    mockReadCachedSession.mockReturnValue({ data: { user: { id: 42 } } });
    mockGetSession.mockRejectedValue(new Error('Network request failed'));

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });
});

describe('lectura de identidad durante el arranque', () => {
  beforeEach(() => jest.clearAllMocks());

  function cachedSession(id = 'user-ana') {
    return {
      data: {
        user: { id, emailVerified: true },
        session: { expiresAt: new Date(Date.now() + 60_000) },
      },
      error: null,
      isPending: false,
    };
  }

  it('reutiliza la sesión verificada vigente sin otra petición de red', async () => {
    mockReadCachedSession.mockReturnValue(cachedSession());
    mockGetSession.mockResolvedValue({ data: null, error: null });

    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('lee el estado actual de Better Auth después de cambiar de cuenta o salir', async () => {
    mockReadCachedSession.mockReturnValue(cachedSession('user-ana'));
    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
    mockReadCachedSession.mockReturnValue(cachedSession('user-luis'));
    await expect(getAuthenticatedUserId()).resolves.toBe('user-luis');
    mockReadCachedSession.mockReturnValue({ data: null, isPending: false });
    mockGetSession.mockResolvedValue({ data: null, error: null });
    await expect(getAuthenticatedUserId()).resolves.toBeNull();
  });

  it('reutiliza la sesión hidratada desde el dispositivo mientras la petición sigue en vuelo', async () => {
    // El cliente Expo rellena `data` desde SecureStore antes de que responda
    // `/get-session`; `isPending` sigue en `true` hasta entonces.
    mockReadCachedSession.mockReturnValue({
      ...cachedSession(),
      isPending: true,
    });
    mockGetSession.mockResolvedValue({ data: null, error: null });

    await expect(getAuthenticatedUserId()).resolves.toBe('user-ana');
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it.each(['expired', 'unverified', 'unauthorized', 'invalidExpiry'])(
    'consulta al servidor si la caché está %s y respeta su 401',
    async (condition) => {
      const cached = cachedSession();
      if (condition === 'expired') cached.data.session.expiresAt = new Date(0);
      if (condition === 'invalidExpiry')
        cached.data.session.expiresAt = new Date('invalid');
      if (condition === 'unverified') cached.data.user.emailVerified = false;
      mockReadCachedSession.mockReturnValue({
        ...cached,
        error: condition === 'unauthorized' ? { status: 401 } : null,
      });
      mockGetSession.mockResolvedValue({ data: null, error: { status: 401 } });
      await expect(getAuthenticatedUserId()).resolves.toBeNull();
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    },
  );
});
