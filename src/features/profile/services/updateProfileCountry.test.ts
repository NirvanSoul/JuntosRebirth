import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import type { LocalProfile } from '@/features/profile/types';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileCountry: jest.fn(),
}));

jest.mock('@/features/profile/services/syncOwnCountry', () => ({
  syncOwnCountry: jest.fn(),
}));

const savedProfile: LocalProfile = {
  avatarUri: null,
  avatarPath: null,
  avatarUpdatedAt: null,
  displayName: null,
  countryCode: 'VE',
};

describe('updateProfileCountry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(saveLocalProfileCountry).mockResolvedValue(savedProfile);
    jest.mocked(syncOwnCountry).mockResolvedValue(true);
  });

  it('publica el país normalizado antes de confirmarlo en local', async () => {
    const profile = await updateProfileCountry('  ve  ');

    expect(syncOwnCountry).toHaveBeenCalledWith('VE', {
      throwOnFailure: true,
    });
    expect(saveLocalProfileCountry).toHaveBeenCalledWith('VE');
    expect(profile).toEqual(savedProfile);
  });

  it('no altera la copia local si el servidor rechaza el cambio', async () => {
    jest.mocked(syncOwnCountry).mockRejectedValue(new Error('conflicto'));

    await expect(updateProfileCountry('VE')).rejects.toThrow('conflicto');
    expect(saveLocalProfileCountry).not.toHaveBeenCalled();
  });
});
