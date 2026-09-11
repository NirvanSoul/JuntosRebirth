import { Asset } from 'expo-asset';
import { preloadOnboardingIllustrations } from './preloadOnboardingIllustrations';

jest.mock('expo-asset', () => ({
  Asset: { loadAsync: jest.fn(async () => []) },
}));

it('precarga una sola vez y únicamente cuando se solicita el onboarding', async () => {
  expect(Asset.loadAsync).not.toHaveBeenCalled();
  await Promise.all([
    preloadOnboardingIllustrations(),
    preloadOnboardingIllustrations(),
  ]);
  expect(Asset.loadAsync).toHaveBeenCalledTimes(1);
});
