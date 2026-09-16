import {
  restoreRemoteProfileDisplayName,
  saveLocalProfileCountry,
} from '@/features/profile/repositories/localProfileRepository';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { restoreOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  getLocalProfile: jest.fn(async () => ({ countryCode: null })),
  saveLocalProfileCountry: jest.fn(),
  restoreRemoteProfileDisplayName: jest.fn(),
}));
jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(async () => 'uuid-ana'),
}));
jest.mock('@/features/profile/services/syncOwnAvatar', () => ({
  restoreOwnAvatar: jest.fn(),
}));
jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('restoreOwnProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('restaura nombre, país y avatar globales en el dispositivo', async () => {
    jest.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'uuid-ana' },
        profile: {
          displayName: 'Ana nueva',
          countryCode: 'VE',
          avatarPath: 'uuid-ana/avatar.jpg',
          avatarUpdatedAt: '2026-09-16T12:30:45.123Z',
        },
      },
    } as never);

    await restoreOwnProfile();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me');
    expect(restoreRemoteProfileDisplayName).toHaveBeenCalledWith('Ana nueva');
    expect(saveLocalProfileCountry).toHaveBeenCalledWith('VE');
    expect(restoreOwnAvatar).toHaveBeenCalledWith({
      userId: 'uuid-ana',
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-09-16T12:30:45.123Z',
    });
  });

  it('conserva la caché si el backend todavía no entrega país', async () => {
    jest
      .mocked(apiClient.get)
      .mockResolvedValue({ data: { profile: {} } } as never);

    await restoreOwnProfile();

    expect(saveLocalProfileCountry).not.toHaveBeenCalled();
    expect(restoreRemoteProfileDisplayName).not.toHaveBeenCalled();
  });

  it('refleja también la eliminación remota de nombre y avatar', async () => {
    jest.mocked(apiClient.get).mockResolvedValue({
      data: {
        profile: {
          displayName: null,
          avatarPath: null,
          avatarUpdatedAt: null,
        },
      },
    } as never);

    await restoreOwnProfile();

    expect(restoreRemoteProfileDisplayName).toHaveBeenCalledWith(null);
    expect(restoreOwnAvatar).toHaveBeenCalledWith({
      userId: 'uuid-ana',
      avatarPath: null,
      avatarUpdatedAt: null,
    });
  });
});
