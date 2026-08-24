import { useCallback, useEffect, useReducer, useRef } from 'react';

import { createSupabaseAuthGateway } from '@/features/auth/gateways/supabaseAuthGateway';
import {
  canCancel as canCancelIn,
  canRetryCancel as canRetryCancelIn,
  canSave as canSaveIn,
  initialRecoveryEpisode,
  isLegalGateHalted,
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

/** Identidad de cada controlador montado, para su concesión de pausa. */
let recoveryOwnerSequence = 0;

/**
 * Controlador del episodio de recuperación (ADR-084). Es el **único** dueño de:
 *
 * - `setNewPassword` y `signOut('local')` —los anfitriones ya no los invocan—;
 * - la identidad del episodio, que descarta resultados tardíos;
 * - su concesión de pausa de la puerta legal;
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
  const { setRecoveryHold } = useLegalSessionGate();

  const { episodeId, state } = episode;

  // Los destinos se leen de una ref: cambiar su identidad entre renders no debe
  // reejecutar el efecto terminal ni disparar el destino dos veces.
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;

  const setRecoveryHoldRef = useRef(setRecoveryHold);
  setRecoveryHoldRef.current = setRecoveryHold;

  /** Concesión propia: liberar la de otro anfitrión sería soltar su pausa. */
  const ownerIdRef = useRef<string | null>(null);
  if (ownerIdRef.current === null) {
    recoveryOwnerSequence += 1;
    ownerIdRef.current = `recovery-${recoveryOwnerSequence}`;
  }
  const ownerId = ownerIdRef.current;

  /** Episodio cuyo destino terminal ya se ejecutó: garantiza «exactamente uno». */
  const settledEpisodeRef = useRef<number | null>(null);

  const halted = isLegalGateHalted(state);
  const savingPassword = state.kind === 'saving' ? state.password : null;
  const isCanceling = state.kind === 'canceling';
  const terminalKind =
    state.kind === 'completed' || state.kind === 'canceled' ? state.kind : null;

  // Invariante 4: la pausa se actualiza SOLO cuando cambia el booleano
  // derivado. Con el `cleanup` en el mismo efecto, React lo ejecutaba en cada
  // transición y la pausa caía un instante entre `requestingCode` y
  // `verifyingCode`, o entre `verifyingCode` y `ready`: un `false` intermedio
  // que podía reanudar brevemente la comprobación de sesión.
  useEffect(() => {
    setRecoveryHoldRef.current(ownerId, halted);
  }, [halted, ownerId]);

  // Liberación por desmontaje, y solo por desmontaje: efecto aparte para que no
  // se ejecute entre transiciones. Libera únicamente la concesión propia.
  useEffect(() => {
    return () => {
      setRecoveryHoldRef.current(ownerId, false);
    };
  }, [ownerId]);

  // `saving`: el controlador ejecuta el guardado con la contraseña que viaja en
  // el propio estado. La cancelación está rechazada por la máquina mientras
  // dure, así que no hay carrera que arbitrar.
  useEffect(() => {
    if (savingPassword === null) return;
    let abandoned = false;
    void (async () => {
      try {
        await setNewPassword(savingPassword);
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
      // Al desmontar no se despacha; y el resultado tampoco puede ensuciar otro
      // episodio, porque el `episodeId` lo descartaría (invariante 2).
      abandoned = true;
    };
  }, [episodeId, savingPassword]);

  // `canceling`: el controlador cierra la sesión local. Guardar está rechazado
  // mientras dure.
  useEffect(() => {
    if (!isCanceling) return;
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
  }, [episodeId, isCanceling]);

  // Invariante 3: un destino por episodio. La ref lo garantiza aunque el efecto
  // se reevalúe.
  useEffect(() => {
    if (terminalKind === null) return;
    if (settledEpisodeRef.current === episodeId) return;
    settledEpisodeRef.current = episodeId;
    if (terminalKind === 'completed') {
      destinationsRef.current.onCompleted();
    } else {
      destinationsRef.current.onCanceled();
    }
  }, [episodeId, terminalKind]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
  const codeSent = useCallback(() => dispatch({ type: 'codeSent' }), []);
  const codeVerified = useCallback(
    () => dispatch({ type: 'codeVerified' }),
    [],
  );

  // La contraseña viaja con el evento: el reductor acepta operación y payload
  // de forma atómica, así que una segunda petición en el mismo tick no puede
  // sustituir el payload de la que ganó.
  const requestSave = useCallback(
    (password: string) => dispatch({ type: 'saveRequested', password }),
    [],
  );

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
