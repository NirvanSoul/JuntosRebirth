import {
  retryPendingDisplayNameSync,
  syncOwnDisplayName,
} from '@/features/profile/services/syncOwnDisplayName';
import {
  getPendingLocalDisplayName,
  markDisplayNameSyncResult,
} from '@/features/profile/repositories/localProfileRepository';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

const mockGetAuthenticatedUserId = jest.fn<Promise<string | null>, []>();

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getPendingLocalDisplayName: jest.fn(),
  markDisplayNameSyncResult: jest.fn(),
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
    jest.mocked(getPendingLocalDisplayName).mockResolvedValue(null);
    jest.mocked(markDisplayNameSyncResult).mockResolvedValue();
  });

  it('publica el nombre en el perfil propio', async () => {
    await expect(syncOwnDisplayName('Farruel')).resolves.toBe(true);

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me/profile', {
      displayName: 'Farruel',
    });
    expect(bootstrapRemoteAccount).toHaveBeenCalled();
    expect(markDisplayNameSyncResult).toHaveBeenCalledWith('Farruel', 'synced');
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
    expect(markDisplayNameSyncResult).toHaveBeenCalledWith('Farruel', 'failed');
  });

  it('reintenta el último nombre pendiente y lo limpia al publicarlo', async () => {
    jest.mocked(getPendingLocalDisplayName).mockResolvedValueOnce('Beatriz');
    await expect(retryPendingDisplayNameSync()).resolves.toBe(true);
    jest.mocked(getPendingLocalDisplayName).mockResolvedValueOnce(null);
    await expect(retryPendingDisplayNameSync()).resolves.toBe(false);
    expect(apiClient.patch).toHaveBeenLastCalledWith('/v1/me/profile', {
      displayName: 'Beatriz',
    });
  });
});
