import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { patch: jest.fn() },
}));

jest.mock('@/features/sync/services/bootstrapRemoteAccount', () => ({
  bootstrapRemoteAccount: jest.fn(),
}));

describe('syncOwnCountry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-ana');
    jest.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
    jest.mocked(bootstrapRemoteAccount).mockResolvedValue();
  });

  it('publica el país en el perfil propio', async () => {
    await expect(syncOwnCountry('VE')).resolves.toBe(true);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me/profile', {
      countryCode: 'VE',
    });
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
  });

  it('no toca la API en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnCountry('ES')).resolves.toBe(false);
    expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('conserva el país local cuando la publicación falla', async () => {
    jest.mocked(apiClient.patch).mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncOwnCountry('ES')).resolves.toBe(false);
  });

  it('propaga el rechazo remoto para un cambio explícito', async () => {
    const rejection = new Error('país incompatible');
    jest.mocked(apiClient.patch).mockRejectedValue(rejection);

    await expect(syncOwnCountry('ES', { throwOnFailure: true })).rejects.toBe(
      rejection,
    );
  });

  it('publica sin repetir bootstrap cuando la sesión ya fue inicializada', async () => {
    await expect(
      syncOwnCountry('ES', { ensureBootstrap: false }),
    ).resolves.toBe(true);

    expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me/profile', {
      countryCode: 'ES',
    });
  });
});
