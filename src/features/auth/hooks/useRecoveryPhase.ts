import { useCallback, useState } from 'react';

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
 */
export function useRecoveryPhase() {
  const [phase, setPhase] = useState<RecoveryPhase>({ kind: 'inactive' });

  const startRecovery = useCallback(() => setPhase({ kind: 'active' }), []);
  const finishRecovery = useCallback(() => setPhase({ kind: 'inactive' }), []);

  const cancelReset = useCallback(async (onCanceled: () => void) => {
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
