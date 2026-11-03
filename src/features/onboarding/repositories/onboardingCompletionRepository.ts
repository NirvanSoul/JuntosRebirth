import AsyncStorage from '@react-native-async-storage/async-storage';

import { markLocalCacheAsOnboardingDraft } from '@/features/sync/repositories/localSyncAccountRepository';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

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

/**
 * Deja constancia de que la caché vacía y sin propietario pasa a ser el
 * cuaderno del onboarding, cuyos datos se asocian a la primera sesión. Sin la
 * marca, esos datos no se podrían atribuir y quedarían aislados. Un fallo no
 * interrumpe el onboarding: solo pierde esa asociación automática.
 */
export async function markOnboardingLocalCache(): Promise<void> {
  try {
    await markLocalCacheAsOnboardingDraft(await getLocalDatabase());
  } catch (error) {
    console.error('[onboarding] No se pudo marcar la caché local', error);
  }
}
