import { useCallback, useEffect, useState } from 'react';

import {
  hasCompletedOnboarding,
  resetOnboardingCompletion,
  saveOnboardingCompletion,
} from '@/features/onboarding/repositories/onboardingCompletionRepository';

type OnboardingCompletionState = {
  complete: () => Promise<void>;
  hasCompleted: boolean;
  isReady: boolean;
  reset: () => Promise<void>;
  setHasCompleted: (completed: boolean) => void;
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
    // Guardamos la finalización en almacenamiento persistente para que al
    // reabrir la app se vaya directo a Acceso. No forzamos setHasCompleted(true)
    // inmediatamente en memoria mientras OnboardingNavigator aloja la lámina de
    // acceso: así evitamos desmontar destructivamente el navegador a mitad de la
    // transición, previniendo la cancelación de peticiones de red y parpadeos.
    await saveOnboardingCompletion();
  }, []);

  const reset = useCallback(async () => {
    await resetOnboardingCompletion();
    setHasCompleted(false);
  }, []);

  return { complete, hasCompleted, isReady, reset, setHasCompleted };
}
