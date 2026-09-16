import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  hasCompletedOnboarding,
  onboardingCompletionStorage,
  resetOnboardingCompletion,
  saveOnboardingCompletion,
} from '@/features/onboarding/repositories/onboardingCompletionRepository';

describe('onboardingCompletionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('considera pendiente el onboarding sin una marca persistida', async () => {
    await expect(hasCompletedOnboarding()).resolves.toBe(false);
  });

  it('persiste que el onboarding terminó en esta instalación', async () => {
    await saveOnboardingCompletion();

    await expect(hasCompletedOnboarding()).resolves.toBe(true);
    await expect(
      AsyncStorage.getItem(onboardingCompletionStorage.key),
    ).resolves.toBe('true');
  });

  it('elimina la marca para poder iniciar el onboarding otra vez', async () => {
    await saveOnboardingCompletion();

    await resetOnboardingCompletion();

    await expect(hasCompletedOnboarding()).resolves.toBe(false);
  });
});
