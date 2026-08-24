import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

type InvitationAuthFlowSnapshot = {
  isAuthReady: boolean;
  session: Session | null;
  previewState: {
    status: 'loading' | 'error' | 'loaded';
    preview?: { status: string };
  };
  acceptState: { status: string };
  /** ADR-084: estado del episodio de recuperación;  es «sin pausa». */
  /**
   * ADR-084: la pausa se consulta con la semántica compartida de la máquina
   * (`isLegalGateHalted`), no comparando cadenas. El éxito termina en
   * `completed`, no en `inactive`: con la comparación anterior la pausa caía
   * pero la autoaceptación seguía bloqueada para siempre.
   */
  isRecoveryHalted: boolean;
  onAccept: () => void;
};

/**
 * Autoaceptación de la invitación cuando aparece la sesión legalmente
 * habilitada, preservando la pausa del OTP de recuperación. La sesión solo se
 * publica desde la puerta legal cuando la evidencia está completa, así que
 * «sesión presente» aquí equivale a «evidencia correcta». El efecto acepta
 * exactamente una vez por carga.
 */
export function useInvitationAutoAcceptance({
  acceptState,
  isAuthReady,
  onAccept,
  previewState,
  isRecoveryHalted,
  session,
}: InvitationAuthFlowSnapshot): void {
  const hasAutoAcceptedRef = useRef(false);
  const initialSessionCheckedRef = useRef(false);
  const hadSessionOnLoadRef = useRef(false);

  useEffect(() => {
    if (!isAuthReady || initialSessionCheckedRef.current) return;
    initialSessionCheckedRef.current = true;
    hadSessionOnLoadRef.current = Boolean(session);
  }, [isAuthReady, session]);

  useEffect(() => {
    if (!initialSessionCheckedRef.current || hadSessionOnLoadRef.current)
      return;
    if (!session) return;
    // Pausa: la sesión del OTP de recuperación no debe autoaceptar.
    if (isRecoveryHalted) return;
    if (
      previewState.status !== 'loaded' ||
      previewState.preview?.status !== 'pending'
    ) {
      return;
    }
    if (acceptState.status !== 'idle' || hasAutoAcceptedRef.current) return;

    hasAutoAcceptedRef.current = true;
    onAccept();
  }, [acceptState.status, isRecoveryHalted, onAccept, previewState, session]);
}
