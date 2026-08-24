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
 *
 * B9(r5): `completeRecovery` distingue la «terminación confirmada» (solo el
 * éxito real de `setNewPassword`, cableada en el `onSuccess` de
 * `ResetPasswordScreen` de los tres anfitriones) de las salidas/cambios de
 * pantalla previos al OTP (`finishRecovery`): publica `inactive` SIN
 * `signOut` y atraviesa `cancelError`, pero nunca compite con un `canceling`
 * en vuelo —la finalización queda serializada detrás de la cancelación—.
 *
 * I1(r5): cada transición publica la fase nueva en la `phaseRef` de forma
 * síncrona (la acompañante del estado que leen los guards), sin esperar al
 * render. `cancelReset` así es atómicamente idempotente: dos llamadas en el
 * mismo tick abren exactamente un `signOut('local')` y un solo callback.
 */
export function useRecoveryPhase() {
  const [phase, setPhase] = useState<RecoveryPhase>({ kind: 'inactive' });
  const phaseRef = useRef<RecoveryPhase>({ kind: 'inactive' });

  // I1(r5): la `phaseRef` es la lectura síncrona que usan los guards entre
  // renders; cada transición la escribe junto con el estado, sin esperar a que
  // React dibuje. Si no, dos `cancelReset` en el mismo tick leen la fase vieja
  // y abren dos `signOut('local')`.
  const commitPhase = (next: RecoveryPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const startRecovery = useCallback(() => {
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    commitPhase({ kind: 'active' });
  }, []);

  // Salida/cambio de pantalla anterior al OTP: normaliza la fase sin tocar la
  // sesión. Bloqueada durante `canceling` y `cancelError`: no puede enmascarar
  // una cancelación fallida (B7).
  const finishRecovery = useCallback(() => {
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    commitPhase({ kind: 'inactive' });
  }, []);

  // B9(r5): terminación confirmada. Solo el éxito real de `setNewPassword`
  // llega aquí (los tres anfitriones la cablean en el `onSuccess` de
  // `ResetPasswordScreen`): publica `inactive` SIN `signOut`, porque la sesión
  // del OTP queda legítimamente habilitada. Atraviesa `cancelError` —una
  // cancelación que falló no puede dejar clavada una recuperación ya
  // terminada—, pero mientras `cancelReset` está en vuelo la finalización
  // queda serializada detrás de la cancelación (`canceling` → no-op).
  const completeRecovery = useCallback(() => {
    if (phaseRef.current.kind === 'canceling') return;
    commitPhase({ kind: 'inactive' });
  }, []);

  const cancelReset = useCallback(async (onCanceled: () => void) => {
    // Idempotente y atómico (I1): el guard se lee de la ref, publicada con
    // `commitPhase` de forma síncrona antes del `await`. Mientras el signOut
    // local está en vuelo, un segundo cancelReset (doble toque en Volver o en
    // Cancelar) se ignora; solo desde `cancelError` se puede invocar de nuevo,
    // y eso es el reintento.
    if (phaseRef.current.kind === 'canceling') return;
    commitPhase({ kind: 'canceling' });
    try {
      await createSupabaseAuthGateway().signOut('local');
      commitPhase({ kind: 'inactive' });
      onCanceled();
    } catch (caught) {
      commitPhase({
        kind: 'cancelError',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos cerrar la sesión de recuperación.',
      });
    }
  }, []);

  return {
    cancelReset,
    completeRecovery,
    finishRecovery,
    phase,
    startRecovery,
  };
}
