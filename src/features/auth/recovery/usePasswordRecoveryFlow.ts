import { useCallback, useEffect, useReducer, useRef } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import {
  canCancel as canCancelIn,
  canRetryCancel as canRetryCancelIn,
  canSave as canSaveIn,
  initialRecoveryEpisode,
  isLegalGateHalted,
  isTerminal,
  recoveryReducer,
  type RecoveryState,
} from '@/features/auth/recovery/recoveryMachine';
import { setNewPassword } from '@/features/auth/services/resetPasswordService';
import { useLegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';

/**
 * Destinos del anfitrión. El controlador ejecuta **uno solo** por episodio, al
 * entrar en el estado terminal correspondiente (invariante 3 de la máquina).
 */
export type RecoveryDestinations = {
  /** Contraseña puesta: la sesión queda legítimamente habilitada. */
  onCompleted: () => void;
  /** Episodio abandonado: si había sesión del OTP, ya está cerrada. */
  onCanceled: () => void;
};

export type PasswordRecoveryFlow = {
  state: RecoveryState;
  /** Mensaje observable del último fallo, de guardado o de cancelación. */
  errorMessage: string | null;
  /** Abre un episodio nuevo («Olvidé mi contraseña»). */
  start: () => void;
  /** El código se envió al correo. */
  codeSent: () => void;
  /** El código se verificó: a partir de aquí existe la sesión del OTP. */
  codeVerified: () => void;
  /** Pide guardar. Se ignora si el episodio no lo admite. */
  requestSave: (password: string) => void;
  /** Pide cancelar (también «Atrás» y el cierre). Se ignora si no lo admite. */
  requestCancel: () => void;
  /** El anfitrión deshabilita su chrome con estos, no con heurísticas propias. */
  canSave: boolean;
  canCancel: boolean;
  canRetryCancel: boolean;
};

/**
 * Controlador del episodio de recuperación (ADR-084). Es el **único** dueño de:
 *
 * - `setNewPassword` y `signOut('local')` —los anfitriones ya no los invocan—;
 * - la identidad del episodio, que descarta resultados tardíos;
 * - la pausa de la puerta legal, que vive y muere con el episodio;
 * - el destino final, exactamente uno.
 *
 * Los anfitriones solo renderizan y entregan sus dos destinos. Sustituye a
 * `useRecoveryPhase` y con él a `pendingCompletionRef`, `outcomeSettledRef`, la
 * fase `cancelingCompletion` y el arbitraje posterior de continuaciones.
 */
export function usePasswordRecoveryFlow(
  destinations: RecoveryDestinations,
): PasswordRecoveryFlow {
  const [episode, dispatch] = useReducer(
    recoveryReducer,
    initialRecoveryEpisode,
  );
  const { setRecoveryHalted } = useLegalSessionGate();

  const { episodeId, state } = episode;

  // Los destinos se leen de una ref: cambiar su identidad entre renders no debe
  // reejecutar el efecto terminal ni disparar el destino dos veces.
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;

  const passwordRef = useRef<string>('');
  /** Episodio cuyo destino terminal ya se ejecutó: garantiza «exactamente uno». */
  const settledEpisodeRef = useRef<number | null>(null);

  // Invariante 4: la pausa pertenece al episodio. Se deriva del estado y no la
  // libera ningún anfitrión al cerrarse. El cleanup cubre el desmontaje.
  useEffect(() => {
    setRecoveryHalted(isLegalGateHalted(state));
    return () => setRecoveryHalted(false);
  }, [setRecoveryHalted, state]);

  // `saving`: el controlador ejecuta el guardado. La cancelación está
  // rechazada por la máquina mientras dure, así que no hay carrera que arbitrar.
  useEffect(() => {
    if (state.kind !== 'saving') return;
    let abandoned = false;
    void (async () => {
      try {
        await setNewPassword(passwordRef.current);
        if (!abandoned) dispatch({ type: 'saveSucceeded', episodeId });
      } catch (caught) {
        if (abandoned) return;
        dispatch({
          type: 'saveFailed',
          episodeId,
          message:
            caught instanceof Error
              ? caught.message
              : 'No pudimos guardar la contraseña.',
        });
      }
    })();
    return () => {
      // Al desmontar no se despacha, pero el resultado tampoco se pierde para
      // otro episodio: el `episodeId` lo descartaría igualmente (invariante 2).
      abandoned = true;
    };
  }, [episodeId, state.kind]);

  // `canceling`: el controlador cierra la sesión local. Guardar está rechazado
  // mientras dure.
  useEffect(() => {
    if (state.kind !== 'canceling') return;
    let abandoned = false;
    void (async () => {
      try {
        await createSupabaseAuthGateway().signOut('local');
        if (!abandoned) dispatch({ type: 'cancelSucceeded', episodeId });
      } catch (caught) {
        if (abandoned) return;
        dispatch({
          type: 'cancelFailed',
          episodeId,
          message:
            caught instanceof Error
              ? caught.message
              : 'No pudimos cerrar la sesión de recuperación.',
        });
      }
    })();
    return () => {
      abandoned = true;
    };
  }, [episodeId, state.kind]);

  // Invariante 3: un destino por episodio. La ref lo garantiza aunque el efecto
  // se reevalúe.
  useEffect(() => {
    if (!isTerminal(state)) return;
    if (settledEpisodeRef.current === episodeId) return;
    settledEpisodeRef.current = episodeId;
    if (state.kind === 'completed') {
      destinationsRef.current.onCompleted();
    } else {
      destinationsRef.current.onCanceled();
    }
  }, [episodeId, state]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
  const codeSent = useCallback(() => dispatch({ type: 'codeSent' }), []);
  const codeVerified = useCallback(
    () => dispatch({ type: 'codeVerified' }),
    [],
  );

  const requestSave = useCallback((password: string) => {
    passwordRef.current = password;
    dispatch({ type: 'saveRequested' });
  }, []);

  const requestCancel = useCallback(
    () => dispatch({ type: 'cancelRequested' }),
    [],
  );

  const errorMessage =
    state.kind === 'saveError' || state.kind === 'cancelError'
      ? state.message
      : null;

  return {
    state,
    errorMessage,
    start,
    codeSent,
    codeVerified,
    requestSave,
    requestCancel,
    canSave: canSaveIn(state),
    canCancel: canCancelIn(state),
    canRetryCancel: canRetryCancelIn(state),
  };
}
