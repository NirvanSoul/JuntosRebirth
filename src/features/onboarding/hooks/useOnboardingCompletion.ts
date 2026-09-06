import { useCallback, useEffect, useState } from 'react';

import {
  hasCompletedOnboarding,
  saveOnboardingCompletion,
} from '@/features/onboarding/repositories/onboardingCompletionRepository';

type OnboardingCompletionState = {
  complete: () => Promise<void>;
  hasCompleted: boolean;
  isReady: boolean;
};

/** Carga y actualiza la marca local que decide si se muestra el onboarding. */
export function useOnboardingCompletion(): OnboardingCompletionState {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void hasCompletedOnboarding()
      .then((completed) => {
        if (isMounted) setHasCompleted(completed);
      })
      .catch((error: unknown) => {
        // Si AsyncStorage falla, no damos el recorrido por realizado: volver a
        // mostrarlo es preferible a saltarlo silenciosamente en una instalación nueva.
        console.error(
          '[onboarding] No se pudo leer el estado de finalización',
          error,
        );
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const complete = useCallback(async () => {
    await saveOnboardingCompletion();
    setHasCompleted(true);
  }, []);

  return { complete, hasCompleted, isReady };
}
