import { syncOwnDisplayName } from '@/features/profile/services/syncOwnDisplayName';
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

describe('syncOwnDisplayName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-ana');
    jest.mocked(apiClient.patch).mockResolvedValue({ data: undefined });
    jest.mocked(bootstrapRemoteAccount).mockResolvedValue();
  });

  it('publica el nombre en el perfil propio', async () => {
    await expect(syncOwnDisplayName('Farruel')).resolves.toBe(true);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me/profile', {
      displayName: 'Farruel',
    });
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
  });

  it('no toca la API en modo invitado', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);

    await expect(syncOwnDisplayName('Farruel')).resolves.toBe(false);
    expect(bootstrapRemoteAccount).not.toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('conserva el nombre local cuando la publicación falla', async () => {
    jest.mocked(apiClient.patch).mockRejectedValue(new Error('sin red'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(syncOwnDisplayName('Farruel')).resolves.toBe(false);
  });
});
