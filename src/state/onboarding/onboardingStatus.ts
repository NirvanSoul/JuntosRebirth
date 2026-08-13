/** Se incrementa cuando el flujo de onboarding cambia de forma relevante. */
export const onboardingVersion = 1;

/**
 * Cómo llegó el usuario al final del onboarding: como invitado (sin sesión)
 * o autenticándose. Distinguirlos permite que un invitado que ya completó el
 * onboarding no vea la pantalla de acceso en cada apertura, mientras que una
 * sesión caducada de alguien que sí se autenticó vuelve a pedirla.
 */
export type OnboardingAccessMode = 'guest' | 'authenticated';

export type OnboardingStatus = {
  completed: boolean;
  completedVersion: number | null;
  accessMode: OnboardingAccessMode | null;
};

export const defaultOnboardingStatus: OnboardingStatus = {
  completed: false,
  completedVersion: null,
  accessMode: null,
};
