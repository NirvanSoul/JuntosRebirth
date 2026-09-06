import { updateProfileCountry } from '@/features/profile/services/updateProfileCountry';
import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { syncOwnCountry } from '@/features/profile/services/syncOwnCountry';
import type { LocalProfile } from '@/features/profile/types';
import { saveCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileCountry: jest.fn(),
}));

jest.mock('@/features/profile/services/syncOwnCountry', () => ({
  syncOwnCountry: jest.fn(),
}));

jest.mock('@/state/appPreferences/currencyPreferencesRepository', () => ({
  saveCurrencyPreferences: jest.fn(),
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
    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['USD', 'VES'],
    });
    expect(saveLocalProfileCountry).toHaveBeenCalledWith('VE');
    expect(profile).toEqual(savedProfile);
  });

  it('no altera la copia local si el servidor rechaza el cambio', async () => {
    jest.mocked(syncOwnCountry).mockRejectedValue(new Error('conflicto'));

    await expect(updateProfileCountry('VE')).rejects.toThrow('conflicto');
    expect(saveLocalProfileCountry).not.toHaveBeenCalled();
    expect(saveCurrencyPreferences).not.toHaveBeenCalled();
  });

  it('permite guardar el país localmente antes de que exista una sesión', async () => {
    const profile = await updateProfileCountry('es', { sync: 'deferred' });

    expect(syncOwnCountry).not.toHaveBeenCalled();
    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['EUR'],
    });
    expect(saveLocalProfileCountry).toHaveBeenCalledWith('ES');
    expect(profile).toEqual(savedProfile);
  });
});
