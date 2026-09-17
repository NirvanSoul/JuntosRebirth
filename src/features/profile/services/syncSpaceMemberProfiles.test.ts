import { syncSpaceMemberProfiles } from '@/features/profile/services/syncSpaceMemberProfiles';

const mockGetAuthenticatedUserId = jest.fn();
const mockFetchSpaceMemberProfiles = jest.fn();
const mockReplaceSpaceMemberProfiles = jest.fn();
const mockRestoreOwnAvatar = jest.fn();
const mockCacheMemberAvatars = jest.fn();

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
}));
jest.mock(
  '@/features/profile/gateways/juntossSpaceMemberProfileGateway',
  () => ({
    fetchSpaceMemberProfiles: (...args: unknown[]) =>
      mockFetchSpaceMemberProfiles(...args),
  }),
);
jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({
    replaceSpaceMemberProfiles: (...args: unknown[]) =>
      mockReplaceSpaceMemberProfiles(...args),
  }),
);
jest.mock('@/features/profile/services/syncOwnAvatar', () => ({
  restoreOwnAvatar: (...args: unknown[]) => mockRestoreOwnAvatar(...args),
}));
jest.mock('@/features/profile/services/cacheMemberAvatars', () => ({
  cacheMemberAvatars: (...args: unknown[]) => mockCacheMemberAvatars(...args),
}));

const profiles = [
  {
    userId: 'user-1',
    displayName: 'Ana',
    avatarPath: 'user-1/avatar.jpg',
    avatarUpdatedAt: '2026-09-17T10:00:00.000Z',
    avatarUri: null,
    defaultCurrency: 'EUR',
  },
];

describe('syncSpaceMemberProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-1');
    mockFetchSpaceMemberProfiles.mockResolvedValue(profiles);
    mockReplaceSpaceMemberProfiles.mockResolvedValue(undefined);
    mockRestoreOwnAvatar.mockResolvedValue(false);
    mockCacheMemberAvatars.mockResolvedValue(undefined);
  });

  it('comparte la sincronización simultánea de un mismo espacio', async () => {
    await Promise.all([
      syncSpaceMemberProfiles('space-1'),
      syncSpaceMemberProfiles('space-1'),
    ]);

    expect(mockFetchSpaceMemberProfiles).toHaveBeenCalledTimes(1);
    expect(mockFetchSpaceMemberProfiles).toHaveBeenCalledWith('space-1');
    expect(mockReplaceSpaceMemberProfiles).toHaveBeenCalledTimes(1);
    expect(mockRestoreOwnAvatar).toHaveBeenCalledTimes(1);
    expect(mockCacheMemberAvatars).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar después de un fallo sin reutilizar la promesa rechazada', async () => {
    mockFetchSpaceMemberProfiles
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValueOnce(profiles);

    await expect(syncSpaceMemberProfiles('space-1')).rejects.toThrow(
      'sin conexión',
    );
    await expect(syncSpaceMemberProfiles('space-1')).resolves.toBe(true);

    expect(mockFetchSpaceMemberProfiles).toHaveBeenCalledTimes(2);
  });
});
