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
    expect(mockReadCachedSession).not.toHaveBeenCalled();
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
