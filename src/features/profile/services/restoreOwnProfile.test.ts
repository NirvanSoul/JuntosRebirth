import { saveLocalProfileCountry } from '@/features/profile/repositories/localProfileRepository';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/features/profile/repositories/localProfileRepository', () => ({
  saveLocalProfileCountry: jest.fn(),
}));
jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('restoreOwnProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('guarda el país remoto en el perfil local', async () => {
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { profile: { countryCode: 'VE' } },
    } as never);

    await restoreOwnProfile();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me');
    expect(saveLocalProfileCountry).toHaveBeenCalledWith('VE');
  });

  it('conserva la caché si el backend todavía no entrega país', async () => {
    jest
      .mocked(apiClient.get)
      .mockResolvedValue({ data: { profile: {} } } as never);

    await restoreOwnProfile();

    expect(saveLocalProfileCountry).not.toHaveBeenCalled();
  });
});
