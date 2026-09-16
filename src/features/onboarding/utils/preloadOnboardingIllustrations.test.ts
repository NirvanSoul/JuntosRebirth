import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import {
  appIllustrations,
  deferredIllustrations,
  nameScreenIllustration,
  preloadAppIllustrations,
  preloadNameScreenIllustration,
  preloadOnboardingIllustrations,
} from './preloadOnboardingIllustrations';

jest.mock('expo-asset', () => ({
  Asset: { loadAsync: jest.fn(async () => []) },
}));

describe('preloadAppIllustrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('precarga la lámina de nombre primero y el resto en orden, una sola vez', async () => {
    const prefetchSpy = jest
      .spyOn(Image, 'prefetch')
      .mockResolvedValue(true as never);
    const resolveSpy = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: 'http://localhost:8081/assets/test.png',
    } as never);

    expect(Asset.loadAsync).not.toHaveBeenCalled();

    // La primera ilustración se resuelve por sí sola, sin esperar al resto.
    await preloadNameScreenIllustration();
    expect(Asset.loadAsync).toHaveBeenCalledTimes(1);
    expect(Asset.loadAsync).toHaveBeenCalledWith(nameScreenIllustration);

    await Promise.all([
      preloadOnboardingIllustrations(),
      preloadAppIllustrations(),
    ]);

    const loaded = (Asset.loadAsync as jest.Mock).mock.calls.map(
      ([source]) => source,
    );
    expect(loaded).toEqual([nameScreenIllustration, ...deferredIllustrations]);
    expect(appIllustrations).toEqual([
      nameScreenIllustration,
      ...deferredIllustrations,
    ]);
    expect(nameScreenIllustration).toBe(
      require('../../../../assets/Onboarding/1_Hola.png'),
    );
    expect(appIllustrations).toContain(
      require('../../../../assets/Onboarding/5.5_Notificaciones.png'),
    );
    expect(appIllustrations).toContain(
      require('../../../../assets/Onboarding/10_loginicon.png'),
    );
    expect(prefetchSpy).toHaveBeenCalledTimes(appIllustrations.length);

    prefetchSpy.mockRestore();
    resolveSpy.mockRestore();
  });
});
