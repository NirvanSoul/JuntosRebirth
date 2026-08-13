import { useCallback, useEffect, useState } from 'react';

import {
  loadOnboardingStatus,
  saveOnboardingStatus,
} from '@/state/onboarding/onboardingStatusRepository';
import {
  defaultOnboardingStatus,
  onboardingVersion,
  type OnboardingStatus,
} from '@/state/onboarding/onboardingStatus';

type OnboardingStatusController = {
  isReady: boolean;
  status: OnboardingStatus;
  /** El usuario terminó el onboarding y eligió probar sin cuenta. */
  markGuestComplete: () => Promise<void>;
  /**
   * El usuario terminó el onboarding autenticándose, o se autenticó después
   * de haberlo completado como invitado (p. ej. desde Ajustes).
   */
  markAuthenticated: () => Promise<void>;
  /** Vuelve a mostrar el flujo sin eliminar el nombre, moneda ni datos locales. */
  restartOnboarding: () => Promise<void>;
};

const statusListeners = new Set<(status: OnboardingStatus) => void>();

function publishStatus(status: OnboardingStatus): void {
  statusListeners.forEach((listener) => listener(status));
}

export function useOnboardingStatus(): OnboardingStatusController {
  const [status, setStatus] = useState<OnboardingStatus>(
    defaultOnboardingStatus,
  );
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadOnboardingStatus()
      .then((stored) => {
        if (isMounted) setStatus(stored);
      })
      .finally(() => {
        if (isMounted) setReady(true);
      });

    const receiveStatus = (next: OnboardingStatus) => setStatus(next);
    statusListeners.add(receiveStatus);

    return () => {
      isMounted = false;
      statusListeners.delete(receiveStatus);
    };
  }, []);

  const markGuestComplete = useCallback(async (): Promise<void> => {
    const next: OnboardingStatus = {
      completed: true,
      completedVersion: onboardingVersion,
      accessMode: 'guest',
    };
    await saveOnboardingStatus(next);
    publishStatus(next);
  }, []);

  const markAuthenticated = useCallback(async (): Promise<void> => {
    const next: OnboardingStatus = {
      completed: true,
      completedVersion: onboardingVersion,
      accessMode: 'authenticated',
    };
    await saveOnboardingStatus(next);
    publishStatus(next);
  }, []);

  const restartOnboarding = useCallback(async (): Promise<void> => {
    await saveOnboardingStatus(defaultOnboardingStatus);
    publishStatus(defaultOnboardingStatus);
  }, []);

  return {
    isReady,
    status,
    markGuestComplete,
    markAuthenticated,
    restartOnboarding,
  };
}
