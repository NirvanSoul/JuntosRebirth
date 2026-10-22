import { syncOwnDefaultCurrency } from '@/features/profile/services/syncOwnDefaultCurrency';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();
const mockIsDemoSessionActive = jest.fn<boolean, []>();

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { patch: jest.fn() },
}));

jest.mock('@/features/sync/services/bootstrapRemoteAccount', () => ({
  bootstrapRemoteAccount: jest.fn(),
}));

jest.mock('@/state/demoSession/demoSessionStore', () => ({
  isDemoSessionActive: () => mockIsDemoSessionActive(),
}));

describe('syncOwnDefaultCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-ana');
    mockIsDemoSessionActive.mockReturnValue(false);
    jest.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
    jest.mocked(bootstrapRemoteAccount).mockResolvedValue();
  });

  it('publica la primera moneda activa en el perfil propio', async () => {
    await expect(syncOwnDefaultCurrency('VES')).resolves.toBe(true);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me/profile', {
      defaultCurrency: 'VES',
    });
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
  });

  it('no toca la API en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnDefaultCurrency('EUR')).resolves.toBe(false);
    expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('no toca la API ni registra un error con el usuario demo', async () => {
    mockIsDemoSessionActive.mockReturnValue(true);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(syncOwnDefaultCurrency('EUR')).resolves.toBe(false);

    expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('conserva la preferencia local cuando la publicación falla', async () => {
    jest.mocked(apiClient.patch).mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncOwnDefaultCurrency('USD')).resolves.toBe(false);
  });
});
