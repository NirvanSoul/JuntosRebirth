import { useCallback, useRef, useState } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';

export type RecoveryPhase =
  | { kind: 'inactive' }
  | { kind: 'active' }
  | { kind: 'canceling' }
  | { kind: 'cancelingCompletion' }
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
 * `signOut` y atraviesa `cancelError`.
 *
 * B10(r6): la terminación también se serializa con una cancelación en vuelo,
 * no se descarta. Cuando `completeRecovery` llega durante `canceling`, la fase
 * pasa a `cancelingCompletion` (la pausa se sostiene igual) y al resolver
 * `cancelReset` la terminación gana de forma definida: con `signOut` con éxito
 * se publica `inactive` sin ejecutar `onCanceled` (el anfitrión ya fue a su
 * destino por la vía de éxito); con `signOut` fallido se publica `inactive`
 * igualmente —nunca `cancelError` con el host cerrado/abandonado—.
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

  // B9(r5)+B10(r6): terminación confirmada. Solo el éxito real de
  // `setNewPassword` llega aquí (los tres anfitriones la cablean en el
  // `onSuccess` de `ResetPasswordScreen`): publica `inactive` SIN `signOut`,
  // porque la sesión del OTP queda legítimamente habilitada. Atraviesa
  // `cancelError` —una cancelación que falló no puede dejar clavada una
  // recuperación ya terminada—. Mientras `cancelReset` está en vuelo la
  // terminación NO se descarta: se encola en `cancelingCompletion` (fase que
  // sostiene la pausa) y al resolver `cancelReset` gana de forma definida.
  const completeRecovery = useCallback(() => {
    if (phaseRef.current.kind === 'canceling') {
      commitPhase({ kind: 'cancelingCompletion' });
      return;
    }
    if (phaseRef.current.kind === 'cancelingCompletion') return;
    commitPhase({ kind: 'inactive' });
  }, []);

  // B10(r6): lectura fresca de la ref para la resolución. `commitPhase` muta
  // `phaseRef.current` durante el `await`, pero TS no lo sabe y conservaría el
  // narrowing del guard inicial («solo inactive|active|cancelError»); al vivir
  // la comparación en su propio alcance evalúa sobre la unión completa.
  const hasCompletionEnqueued = () =>
    phaseRef.current.kind === 'cancelingCompletion';

  const cancelReset = useCallback(async (onCanceled: () => void) => {
    // Idempotente y atómico (I1) + B10(r6): el guard se lee de la ref y
    // también cubre `cancelingCompletion` —con el signOut en vuelo o con una
    // terminación encolada nunca se abre una segunda cancelación—. Publica
    // `canceling` en la ref con `commitPhase` de forma síncrona antes del
    // `await`; solo desde `cancelError` se puede invocar de nuevo (reintento).
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelingCompletion'
    ) {
      return;
    }
    commitPhase({ kind: 'canceling' });
    try {
      await createSupabaseAuthGateway().signOut('local');
      // B10(r6): si la persona guardó la contraseña mientras el signOut estaba
      // en vuelo, la terminación encolada gana: `inactive` sin `onCanceled`
      // (el anfitrión ya fue a su destino por la vía de éxito; empujarlo al
      // destino de cancelación perdería la autoaceptación de la invitación).
      if (hasCompletionEnqueued()) {
        commitPhase({ kind: 'inactive' });
        return;
      }
      commitPhase({ kind: 'inactive' });
      onCanceled();
    } catch (caught) {
      // B10(r6): la terminación encolada también gana sobre el fallo del
      // signOut: la contraseña se guardó y la sesión del OTP es legítima.
      // Publicar `cancelError` con el host cerrado/abandonado sería B9.
      if (hasCompletionEnqueued()) {
        commitPhase({ kind: 'inactive' });
        return;
      }
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
