import { useCallback, useEffect, useRef } from 'react';

import { useLegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';

/**
 * Diferencia el marcado de «onboarding autenticado» hasta que la puerta legal
 * habilita la sesión. Mientras falta evidencia no se marca como autenticado
 * (ADR-083): el flujo de acceso actualiza el estado de onboarding solo cuando
 * las versiones vigentes ya constan.
 */
export function useDeferredAuthenticatedMark(): {
  scheduleMarkAuthenticated: () => void;
} {
  const { markAuthenticated } = useOnboardingStatus();
  const { isLegallyEnabled } = useLegalSessionGate();
  const pendingRef = useRef(false);

  const scheduleMarkAuthenticated = useCallback(() => {
    if (isLegallyEnabled) {
      void markAuthenticated();
      return;
    }
    pendingRef.current = true;
  }, [isLegallyEnabled, markAuthenticated]);

  useEffect(() => {
    if (pendingRef.current && isLegallyEnabled) {
      pendingRef.current = false;
      void markAuthenticated();
    }
  }, [isLegallyEnabled, markAuthenticated]);

  return { scheduleMarkAuthenticated };
}
