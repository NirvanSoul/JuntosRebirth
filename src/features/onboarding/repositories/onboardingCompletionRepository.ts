import AsyncStorage from '@react-native-async-storage/async-storage';

const onboardingCompletionStorageKey = '@juntoss/onboarding-completion/v1';

/** El onboarding pertenece a la instalación, no a la sesión que haya abierta. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  return (
    (await AsyncStorage.getItem(onboardingCompletionStorageKey)) === 'true'
  );
}

export async function saveOnboardingCompletion(): Promise<void> {
  await AsyncStorage.setItem(onboardingCompletionStorageKey, 'true');
}

export async function resetOnboardingCompletion(): Promise<void> {
  await AsyncStorage.removeItem(onboardingCompletionStorageKey);
}

export const onboardingCompletionStorage = {
  key: onboardingCompletionStorageKey,
};
