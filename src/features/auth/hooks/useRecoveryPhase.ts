import type { Session } from '@supabase/supabase-js';
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
 * B10(r6)+B11(r7): la terminación también se serializa con una cancelación en
 * vuelo, no se descarta. Cuando `completeRecovery` llega durante `canceling`, la
 * fase pasa a `cancelingCompletion` (la pausa se sostiene igual). El ganador al
 * resolver `cancelReset` se define con el **estado real posterior** de la
 * sesión (`getSession`), no con el éxito/fallo del `signOut`: GoTrue elimina la
 * sesión local también en la mayoría de errores del `_signOut`, así que una
 * excepción no prueba que la sesión siga viva. Sesión `null` → ganó la
 * cancelación (`inactive` + `onCanceled`); sesión presente → ganó la
 * terminación (`inactive`, sin `onCanceled`); estado desconocido → `cancelError`
 * (fallo observable seguro, nunca asumir que vive).
 *
 * B12(r7): `cancelingCompletion` es pegajosa frente a TODOS los escritores:
 * `startRecovery`, `finishRecovery` y `cancelReset` no la mueven mientras el
 * `signOut` está en vuelo, para que la resolución nunca pierda la marca.
 *
 * I1(r5): cada transición publica la fase nueva en la `phaseRef` de forma
 * síncrona (la acompañante del estado que leen los guards), sin esperar al
 * render. `cancelReset` así es atómicamente idempotente: dos llamadas en el
 * mismo tick abren exactamente un `signOut('local')` y un solo callback.
 */
/** Terminación encolada sin destino propio (el host no navega a ninguna parte). */
const noop = () => undefined;

export function useRecoveryPhase() {
  const [phase, setPhase] = useState<RecoveryPhase>({ kind: 'inactive' });
  const phaseRef = useRef<RecoveryPhase>({ kind: 'inactive' });
  // B13(r8): continuación de éxito encolada mientras la cancelación resuelve.
  // `null` significa «no hay terminación encolada».
  const pendingCompletionRef = useRef<(() => void) | null>(null);
  // B14(r9): `inactive` significa DOS cosas —«no hay recuperación en curso» y
  // «este episodio ya se resolvió»— y confundirlas reabría el doble destino.
  // Esta ref marca la segunda: el episodio ya produjo su desenlace y ninguna
  // terminación tardía puede ejecutar otro. Solo `startRecovery` la reabre.
  const outcomeSettledRef = useRef(false);

  // I1(r5): la `phaseRef` es la lectura síncrona que usan los guards entre
  // renders; cada transición la escribe junto con el estado, sin esperar a que
  // React dibuje. Si no, dos `cancelReset` en el mismo tick leen la fase vieja
  // y abren dos `signOut('local')`.
  const commitPhase = (next: RecoveryPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const startRecovery = useCallback(() => {
    // B12(r7): `cancelingCompletion` también bloquea: con la terminación
    // encolada ningún escritor puede mover la fase.
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelingCompletion' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    // B14(r9): abre un episodio nuevo. Es el único punto que reabre la
    // terminación tras un desenlace: «Olvidé mi contraseña» de nuevo.
    outcomeSettledRef.current = false;
    commitPhase({ kind: 'active' });
  }, []);

  // Salida/cambio de pantalla anterior al OTP: normaliza la fase sin tocar la
  // sesión. Bloqueada durante `canceling`, `cancelingCompletion` y
  // `cancelError`: no puede enmascarar una cancelación fallida (B7/B12).
  const finishRecovery = useCallback(() => {
    if (
      phaseRef.current.kind === 'canceling' ||
      phaseRef.current.kind === 'cancelingCompletion' ||
      phaseRef.current.kind === 'cancelError'
    ) {
      return;
    }
    outcomeSettledRef.current = true;
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
  //
  // B13(r8): se encola la CONTINUACIÓN junto con el estado. Antes el host
  // ejecutaba su destino de éxito (cerrar el modal, navegar) nada más llamar
  // aquí, sin esperar al ganador: si después ganaba la cancelación se ejecutaban
  // dos destinos, y si `getSession` fallaba el `cancelError` quedaba invisible
  // con el host ya cerrado. Ahora el destino lo ejecuta la resolución, una vez.
  const completeRecovery = useCallback((onCompleted?: () => void) => {
    if (phaseRef.current.kind === 'canceling') {
      pendingCompletionRef.current = onCompleted ?? noop;
      commitPhase({ kind: 'cancelingCompletion' });
      return;
    }
    if (phaseRef.current.kind === 'cancelingCompletion') return;
    // B14(r9): el orden inverso. Si la cancelación resolvió antes de que
    // respondiera `setNewPassword`, este episodio ya ejecutó su destino y la
    // fase es un `inactive` TERMINAL. `ResetPasswordScreen` llama a `onSuccess`
    // al resolver aunque esté desmontada, así que esa terminación tardía llega
    // igual: se ignora, o volveríamos a tener dos destinos.
    if (outcomeSettledRef.current) return;
    outcomeSettledRef.current = true;
    pendingCompletionRef.current = null;
    commitPhase({ kind: 'inactive' });
    onCompleted?.();
  }, []);

  // B13(r8): la marca de «terminación encolada» vive en su propia ref, no en la
  // fase. Así sobrevive a `cancelError`: si `getSession` falla, el reintento
  // sigue sabiendo que la contraseña ya se guardó y no degrada la terminación a
  // una cancelación. La fase describe la pausa; la ref describe el destino.
  const hasCompletionEnqueued = () => pendingCompletionRef.current !== null;

  const cancelReset = useCallback(async (onCanceled: () => void) => {
    // Idempotente y atómico (I1) + B12(r7): el guard se lee de la ref y cubre
    // también `cancelingCompletion` —con el signOut en vuelo o con una
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
    let signOutFailed = false;
    let signOutErrorMessage = 'No pudimos cerrar la sesión de recuperación.';
    try {
      await createSupabaseAuthGateway().signOut('local');
    } catch (caught) {
      // B11(r7): la excepción de GoTrue no prueba que la sesión siga viva; el
      // ganador se decide después, con el estado real posterior.
      signOutFailed = true;
      signOutErrorMessage =
        caught instanceof Error ? caught.message : signOutErrorMessage;
    }

    // Sin terminación encolada: el contrato previo sigue valiendo. El fallo es
    // una cancelación fallida observable (mensaje visible y reintento).
    if (!hasCompletionEnqueued()) {
      if (signOutFailed) {
        // `cancelError` NO cierra el episodio: el reintento sigue vivo.
        commitPhase({ kind: 'cancelError', message: signOutErrorMessage });
      } else {
        // B14(r9): la cancelación gana y cierra el episodio. Un `onSuccess`
        // tardío de un `setNewPassword` que aún estaba en vuelo no podrá
        // ejecutar un segundo destino.
        outcomeSettledRef.current = true;
        commitPhase({ kind: 'inactive' });
        onCanceled();
      }
      return;
    }

    // B11(r7): con una terminación encolada el resultado se define por el
    // estado real de la sesión posterior al signOut:
    // - sesión `null` → ganó la cancelación: `inactive` + `onCanceled` (no hay
    //   sesión que habilitar; la invitación no puede autoaceptar);
    // - sesión presente → ganó la terminación: `inactive` + su continuación;
    // - estado desconocido (`getSession` lanza) → fallo observable seguro:
    //   `cancelError`, jamás asumir que la sesión sigue viva.
    // B13(r8): cada rama ejecuta EXACTAMENTE UN destino, o ninguno cuando el
    // estado es desconocido —ahí la persona sigue en la superficie actual, con
    // el mensaje visible y el mismo botón para reintentar—.
    let liveSession: Session | null;
    try {
      liveSession = await createSupabaseAuthGateway().getSession();
    } catch (caught) {
      // La terminación encolada se CONSERVA: la contraseña ya se guardó, así
      // que el reintento debe seguir pudiendo resolver a favor de la
      // terminación en vez de degradarla a cancelación.
      commitPhase({
        kind: 'cancelError',
        message:
          caught instanceof Error
            ? caught.message
            : 'No pudimos confirmar el estado de sesión.',
      });
      return;
    }
    const completion = pendingCompletionRef.current ?? noop;
    pendingCompletionRef.current = null;
    // B14(r9): gane quien gane, aquí el episodio queda cerrado.
    outcomeSettledRef.current = true;
    if (liveSession === null) {
      commitPhase({ kind: 'inactive' });
      onCanceled();
      return;
    }
    commitPhase({ kind: 'inactive' });
    completion();
  }, []);

  return {
    cancelReset,
    completeRecovery,
    finishRecovery,
    phase,
    startRecovery,
  };
}
