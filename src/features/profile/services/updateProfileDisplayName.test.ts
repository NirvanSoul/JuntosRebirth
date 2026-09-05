import { updateProfileDisplayName } from '@/features/profile/services/updateProfileDisplayName';
import { saveLocalProfileDisplayName } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnDisplayName } from '@/features/profile/services/syncOwnDisplayName';
import type { LocalProfile } from '@/features/profile/types';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileDisplayName: jest.fn(),
}));

jest.mock('@/features/profile/services/syncOwnDisplayName', () => ({
  syncOwnDisplayName: jest.fn(),
}));

const savedProfile: LocalProfile = {
  avatarUri: null,
  avatarPath: null,
  avatarUpdatedAt: null,
  displayName: 'Farruel',
  countryCode: null,
};

describe('updateProfileDisplayName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(saveLocalProfileDisplayName).mockResolvedValue(savedProfile);
    jest.mocked(syncOwnDisplayName).mockResolvedValue(true);
  });

  it('guarda el nombre en local recortado antes de publicarlo', async () => {
    const profile = await updateProfileDisplayName('  Farruel  ');

    expect(saveLocalProfileDisplayName).toHaveBeenCalledWith('Farruel');
    expect(profile).toEqual(savedProfile);
  });

  it('publica el cambio sin esperar a que termine', async () => {
    let resolveSync: (() => void) | undefined;
    jest.mocked(syncOwnDisplayName).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () => resolve(true);
        }),
    );

    await updateProfileDisplayName('Farruel');

    expect(syncOwnDisplayName).toHaveBeenCalledWith('Farruel');
    resolveSync?.();
  });
});
