import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  defaultOnboardingStatus,
  type OnboardingAccessMode,
  type OnboardingStatus,
} from '@/state/onboarding/onboardingStatus';

const onboardingStatusStorageKey = '@juntoss/onboarding-status/v1';

type StoredOnboardingStatus = {
  version: 1;
  completed: boolean;
  completedVersion: number | null;
  accessMode: OnboardingAccessMode | null;
};

function isAccessMode(value: unknown): value is OnboardingAccessMode {
  return value === 'guest' || value === 'authenticated';
}

function parseStoredOnboardingStatus(value: string): OnboardingStatus {
  const parsed: unknown = JSON.parse(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('El estado de onboarding guardado no es válido');
  }

  const candidate = parsed as Partial<StoredOnboardingStatus>;
  if (
    candidate.version !== 1 ||
    typeof candidate.completed !== 'boolean' ||
    (candidate.completedVersion !== null &&
      typeof candidate.completedVersion !== 'number') ||
    (candidate.accessMode !== null && !isAccessMode(candidate.accessMode))
  ) {
    throw new Error('El estado de onboarding guardado no es válido');
  }

  return {
    completed: candidate.completed,
    completedVersion: candidate.completedVersion ?? null,
    accessMode: candidate.accessMode ?? null,
  };
}

export async function loadOnboardingStatus(): Promise<OnboardingStatus> {
  const stored = await AsyncStorage.getItem(onboardingStatusStorageKey);

  if (stored === null) {
    return defaultOnboardingStatus;
  }

  try {
    return parseStoredOnboardingStatus(stored);
  } catch {
    return defaultOnboardingStatus;
  }
}

export async function saveOnboardingStatus(
  status: OnboardingStatus,
): Promise<void> {
  const stored: StoredOnboardingStatus = {
    version: 1,
    completed: status.completed,
    completedVersion: status.completedVersion,
    accessMode: status.accessMode,
  };

  await AsyncStorage.setItem(
    onboardingStatusStorageKey,
    JSON.stringify(stored),
  );
}
