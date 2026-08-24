import { useCallback, useEffect, useRef } from 'react';

import { useLegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';
import { useOnboardingStatus } from '@/state/onboarding/useOnboardingStatus';

/**
 * Diferencia el marcado de «onboarding autenticado» hasta que la puerta legal
 * confirma la evidencia de la sesión. Solo un estado `cleared` (sesión presente
 * y comprobada) autoriza a marcar: ni el invitado ni una sesión aún sin
 * comprobar pueden afirmar que existe evidencia legal (B2).
 */
export function useDeferredAuthenticatedMark(): {
  scheduleMarkAuthenticated: () => void;
} {
  const { markAuthenticated } = useOnboardingStatus();
  const { status } = useLegalSessionGate();
  const pendingRef = useRef(false);
  const isCleared = status.kind === 'cleared';

  const scheduleMarkAuthenticated = useCallback(() => {
    if (isCleared) {
      void markAuthenticated();
      return;
    }
    pendingRef.current = true;
  }, [isCleared, markAuthenticated]);

  useEffect(() => {
    if (pendingRef.current && isCleared) {
      pendingRef.current = false;
      void markAuthenticated();
    }
  }, [isCleared, markAuthenticated]);

  return { scheduleMarkAuthenticated };
}
