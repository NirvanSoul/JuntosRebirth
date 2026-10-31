import {
  restoreRemoteProfileDisplayName,
  saveLocalProfileCountry,
} from '@/features/profile/repositories/localProfileRepository';
import { restoreOwnProfile } from '@/features/profile/services/restoreOwnProfile';
import { restoreOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { syncOwnDefaultCurrency } from '@/features/profile/services/syncOwnDefaultCurrency';
import { apiClient } from '@/services/api/juntossApiClient';
import {
  loadStoredCurrencyPreferences,
  saveCurrencyPreferences,
} from '@/state/appPreferences/currencyPreferencesRepository';

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
jest.mock('@/features/profile/services/syncOwnDefaultCurrency', () => ({
  syncOwnDefaultCurrency: jest.fn(async () => true),
}));
jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));
jest.mock('@/state/appPreferences/currencyPreferencesRepository', () => ({
  loadStoredCurrencyPreferences: jest.fn(async () => ({
    currencies: ['EUR'],
  })),
  saveCurrencyPreferences: jest.fn(),
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
    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['USD', 'VES'],
    });
    expect(restoreOwnAvatar).toHaveBeenCalledWith({
      userId: 'uuid-ana',
      avatarPath: 'uuid-ana/avatar.jpg',
      avatarUpdatedAt: '2026-09-16T12:30:45.123Z',
    });
  });

  it('no reescribe las monedas de Venezuela si ya están guardadas', async () => {
    jest
      .mocked(loadStoredCurrencyPreferences)
      .mockResolvedValueOnce({ currencies: ['USD', 'VES'] });
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { profile: { countryCode: 'VE' } },
    } as never);

    await restoreOwnProfile();

    expect(saveCurrencyPreferences).not.toHaveBeenCalled();
  });

  it('siembra las monedas del país si nunca se guardaron', async () => {
    jest.mocked(loadStoredCurrencyPreferences).mockResolvedValueOnce(null);
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { profile: { countryCode: 'CO' } },
    } as never);

    await restoreOwnProfile();

    expect(saveCurrencyPreferences).toHaveBeenCalledWith({
      currencies: ['COP'],
    });
    expect(syncOwnDefaultCurrency).toHaveBeenCalledWith('COP');
  });

  it('respeta las monedas que la persona ya eligió fuera de Venezuela', async () => {
    jest
      .mocked(loadStoredCurrencyPreferences)
      .mockResolvedValueOnce({ currencies: ['COP', 'USD'] });
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { profile: { countryCode: 'CO' } },
    } as never);

    await restoreOwnProfile();

    expect(saveCurrencyPreferences).not.toHaveBeenCalled();
    expect(syncOwnDefaultCurrency).not.toHaveBeenCalled();
  });

  it('no siembra EUR si el país no está en el catálogo', async () => {
    jest.mocked(loadStoredCurrencyPreferences).mockResolvedValueOnce(null);
    jest.mocked(apiClient.get).mockResolvedValue({
      data: { profile: { countryCode: 'EC' } },
    } as never);

    await restoreOwnProfile();

    expect(saveCurrencyPreferences).not.toHaveBeenCalled();
    expect(syncOwnDefaultCurrency).not.toHaveBeenCalled();
  });

  it('conserva la caché si el backend todavía no entrega país', async () => {
    jest
      .mocked(apiClient.get)
      .mockResolvedValue({ data: { profile: {} } } as never);

    await restoreOwnProfile();

    expect(saveLocalProfileCountry).not.toHaveBeenCalled();
    expect(restoreRemoteProfileDisplayName).not.toHaveBeenCalled();
    expect(saveCurrencyPreferences).not.toHaveBeenCalled();
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
