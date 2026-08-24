import { useCallback, useRef, useState } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';

export type RecoveryPhase =
  | { kind: 'inactive' }
  | { kind: 'active' }
  | { kind: 'canceling' }
  | { kind: 'cancelError'; message: string };

/**
 * Ciclo del subflujo de recuperación de contraseña, compartido por los tres
 * anfitriones de autenticación (invitación, acceso inicial y Ajustes).
 * Mientras `phase.kind !== 'inactive'`, la sesión creada por el OTP de
 * recuperación queda en pausa: no puede autoaceptar ni cortocircuitar a la
 * puerta de sesión. Cancelar cierra solo la sesión local (`scope: 'local'`),
 * igual que abandona la puerta, para no revocar la sesión del usuario en sus
 * otros dispositivos (B7): cancelar un restablecimiento sin haber puesto la
 * contraseña nueva jamás deja la sesión del OTP habilitada.
 *
 * B7(r4): las transiciones están blindadas para que ninguna salida pueda
 * abandonar la recuperación sin pasar por `cancelReset`. Mientras el
 * `signOut('local')` está en vuelo (`canceling`) los demás escritores quedan
 * bloqueados —un segundo `cancelReset` no abre otra cuenta de la sesión, y ni
 * `startRecovery` ni `finishRecovery` pueden cambiar la fase—. Tras un fallo
 * (`cancelError`) la recuperación queda bloqueada y la pausa retenida hasta
 * que el mismo `cancelReset` reintente y llegue a término.
 */
export function useRecoveryPhase() {
  const [phase, setPhase] = useState<RecoveryPhase>({ kind: 'inactive' });
  const phaseRef = useRef<RecoveryPhase>({ kind: 'inactive' });
  phaseRef.current = phase;

  const startRecovery = useCallback(() => {
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    setPhase({ kind: 'active' });
  }, []);

  const finishRecovery = useCallback(() => {
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    setPhase({ kind: 'inactive' });
  }, []);

  const cancelReset = useCallback(async (onCanceled: () => void) => {
    // Idempotente: mientras el signOut local está en vuelo, un segundo
    // cancelReset (doble toque en Volver o en Cancelar) se ignora; solo desde
    // `cancelError` se puede invocar de nuevo, y eso es el reintento.
    if (phaseRef.current.kind === 'canceling') return;
    setPhase({ kind: 'canceling' });
    try {
      await createSupabaseAuthGateway().signOut('local');
      setPhase({ kind: 'inactive' });
      onCanceled();
    } catch (caught) {
      setPhase({
        kind: 'cancelError',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos cerrar la sesión de recuperación.',
      });
    }
  }, []);

  return { cancelReset, finishRecovery, phase, startRecovery };
}
