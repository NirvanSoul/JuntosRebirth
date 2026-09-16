import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import {
  appIllustrations,
  preloadAppIllustrations,
  preloadOnboardingIllustrations,
} from './preloadOnboardingIllustrations';

jest.mock('expo-asset', () => ({
  Asset: { loadAsync: jest.fn(async () => []) },
}));

describe('preloadAppIllustrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('precarga una sola vez y únicamente cuando se solicita', async () => {
    const prefetchSpy = jest
      .spyOn(Image, 'prefetch')
      .mockResolvedValue(true as never);
    const resolveSpy = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: 'http://localhost:8081/assets/test.png',
    } as never);

    expect(Asset.loadAsync).not.toHaveBeenCalled();
    await Promise.all([
      preloadOnboardingIllustrations(),
      preloadAppIllustrations(),
    ]);

    expect(Asset.loadAsync).toHaveBeenCalledTimes(1);
    expect(Asset.loadAsync).toHaveBeenCalledWith(appIllustrations);
    expect(appIllustrations).toContain(
      require('../../../../assets/Onboarding/5.5_Notificaciones.png'),
    );
    expect(appIllustrations).toContain(
      require('../../../../assets/Onboarding/10_loginicon.png'),
    );
    expect(prefetchSpy).toHaveBeenCalled();

    prefetchSpy.mockRestore();
    resolveSpy.mockRestore();
  });
});
