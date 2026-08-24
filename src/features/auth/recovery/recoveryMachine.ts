/**
 * Máquina del episodio de recuperación de contraseña (ADR-084).
 *
 * Nueve rondas de Gate 2 (B1–B14) demostraron que coordinar el guardado y la
 * cancelación con guardas locales no converge: cada arreglo añadía un estado
 * implícito y ese estado abría un orden nuevo. Aquí la coordinación se resuelve
 * por construcción, no por arbitraje posterior.
 *
 * ## Regla
 *
 * **Gana la primera operación ACEPTADA, no la primera que termina.**
 *
 * ## Invariantes
 *
 * 1. `saving` y `canceling` son estados distintos y no hay transición entre
 *    ellos: las dos operaciones **nunca están en vuelo a la vez**. No hace falta
 *    arbitrar quién gana porque no puede haber dos candidatos.
 * 2. Todo resultado asíncrono viaja con su `episodeId`. Un resultado de un
 *    episodio anterior se ignora: no puede reabrir ni ensuciar el actual. Esto
 *    sustituye a `outcomeSettledRef` y a las continuaciones tardías (B14).
 * 3. Hay exactamente **dos estados terminales** —`completed` y `canceled`— y un
 *    episodio alcanza uno solo. El destino del anfitrión se ejecuta al entrar en
 *    el terminal, una vez. Esto sustituye a `pendingCompletionRef` (B13).
 * 4. La pausa de la puerta legal **pertenece al episodio**: se deriva del estado
 *    y solo cae al llegar a un terminal. Ningún anfitrión la libera por su
 *    cuenta al cerrarse (B3, B7).
 * 5. Antes de verificar el código no existe sesión: cancelar ahí es abandonar,
 *    sin `signOut`. Después de verificarlo, cancelar **siempre** cierra la
 *    sesión local (B7).
 *
 * ## Precio deliberado
 *
 * Mientras `saving` está en vuelo no se puede cancelar, ni volver atrás, ni
 * cerrar. Es la contrapartida de eliminar la carrera, y es intencional: un
 * guardado que no responde deja el episodio retenido hasta que resuelva o falle.
 * `saveError` devuelve el control completo.
 */

/** Identidad del episodio: todo resultado asíncrono la lleva (invariante 2). */
export type RecoveryEpisodeId = number;

export type RecoveryState =
  /** Sin recuperación en curso. Único estado que admite abrir un episodio. */
  | { kind: 'inactive' }
  /** Pidiendo el código: aún no hay sesión. */
  | { kind: 'requestingCode' }
  /** Código enviado, pendiente de verificar: aún no hay sesión. */
  | { kind: 'verifyingCode' }
  /** Código verificado: la sesión del OTP existe y la pantalla pide contraseña. */
  | { kind: 'ready' }
  /** `setNewPassword` en vuelo. No admite cancelar, volver ni cerrar. */
  | { kind: 'saving' }
  /** El guardado falló: se puede reintentar o cancelar. */
  | { kind: 'saveError'; message: string }
  /** `signOut('local')` en vuelo. No admite guardar. */
  | { kind: 'canceling' }
  /** La cancelación falló: la sesión puede seguir viva, solo cabe reintentar. */
  | { kind: 'cancelError'; message: string }
  /** Terminal: contraseña puesta, la sesión queda legítimamente habilitada. */
  | { kind: 'completed' }
  /** Terminal: episodio abandonado; si había sesión, ya se cerró. */
  | { kind: 'canceled' };

export type RecoveryEvent =
  | { type: 'start' }
  | { type: 'codeSent' }
  | { type: 'codeVerified' }
  | { type: 'saveRequested' }
  | { type: 'saveSucceeded'; episodeId: RecoveryEpisodeId }
  | { type: 'saveFailed'; episodeId: RecoveryEpisodeId; message: string }
  | { type: 'cancelRequested' }
  | { type: 'cancelSucceeded'; episodeId: RecoveryEpisodeId }
  | { type: 'cancelFailed'; episodeId: RecoveryEpisodeId; message: string };

export type RecoveryEpisode = {
  readonly episodeId: RecoveryEpisodeId;
  readonly state: RecoveryState;
};

export const initialRecoveryEpisode: RecoveryEpisode = {
  episodeId: 0,
  state: { kind: 'inactive' },
};

/** Estados en los que la sesión del OTP ya existe: cancelar exige `signOut`. */
const statesWithSession: readonly RecoveryState['kind'][] = [
  'ready',
  'saving',
  'saveError',
  'canceling',
  'cancelError',
];

/** Estados terminales: el episodio ya produjo su desenlace (invariante 3). */
const terminalStates: readonly RecoveryState['kind'][] = [
  'completed',
  'canceled',
];

export function isTerminal(state: RecoveryState): boolean {
  return terminalStates.includes(state.kind);
}

export function hasOtpSession(state: RecoveryState): boolean {
  return statesWithSession.includes(state.kind);
}

/**
 * Pausa de la puerta legal (invariante 4): activa durante todo el episodio y
 * solo hasta el terminal. `inactive` y los terminales no pausan.
 */
export function isLegalGateHalted(state: RecoveryState): boolean {
  return state.kind !== 'inactive' && !isTerminal(state);
}

/** Cancelar, volver atrás y cerrar: bloqueados con una operación en vuelo. */
export function canCancel(state: RecoveryState): boolean {
  switch (state.kind) {
    case 'requestingCode':
    case 'verifyingCode':
    case 'ready':
    case 'saveError':
      return true;
    // `canceling` ya está cancelando; `cancelError` reintenta por su propia vía.
    default:
      return false;
  }
}

/** Guardar: bloqueado mientras una cancelación está en vuelo o ya decidió. */
export function canSave(state: RecoveryState): boolean {
  return state.kind === 'ready' || state.kind === 'saveError';
}

/** Reintentar la cancelación: solo desde el fallo observable. */
export function canRetryCancel(state: RecoveryState): boolean {
  return state.kind === 'cancelError';
}

/**
 * Reductor puro. Todo evento no contemplado para el estado actual devuelve el
 * mismo episodio por identidad: el llamante puede comparar con `===` para saber
 * que el evento fue rechazado o ignorado.
 */
export function recoveryReducer(
  episode: RecoveryEpisode,
  event: RecoveryEvent,
): RecoveryEpisode {
  const { episodeId, state } = episode;

  // Invariante 2: un resultado de otro episodio nunca toca el actual.
  if ('episodeId' in event && event.episodeId !== episodeId) {
    return episode;
  }

  switch (event.type) {
    case 'start':
      // Un episodio nuevo solo nace desde `inactive` o desde un terminal: no se
      // puede reabrir uno con una operación en vuelo.
      if (state.kind !== 'inactive' && !isTerminal(state)) return episode;
      return { episodeId: episodeId + 1, state: { kind: 'requestingCode' } };

    case 'codeSent':
      if (state.kind !== 'requestingCode') return episode;
      return { episodeId, state: { kind: 'verifyingCode' } };

    case 'codeVerified':
      if (state.kind !== 'verifyingCode') return episode;
      return { episodeId, state: { kind: 'ready' } };

    case 'saveRequested':
      // Invariante 1: jamás desde `canceling`/`cancelError`.
      if (!canSave(state)) return episode;
      return { episodeId, state: { kind: 'saving' } };

    case 'saveSucceeded':
      if (state.kind !== 'saving') return episode;
      return { episodeId, state: { kind: 'completed' } };

    case 'saveFailed':
      if (state.kind !== 'saving') return episode;
      return {
        episodeId,
        state: { kind: 'saveError', message: event.message },
      };

    case 'cancelRequested':
      // Invariante 1: jamás desde `saving`.
      if (!canCancel(state) && !canRetryCancel(state)) return episode;
      // Invariante 5: sin sesión del OTP no hay nada que cerrar.
      if (!hasOtpSession(state)) {
        return { episodeId, state: { kind: 'canceled' } };
      }
      return { episodeId, state: { kind: 'canceling' } };

    case 'cancelSucceeded':
      if (state.kind !== 'canceling') return episode;
      return { episodeId, state: { kind: 'canceled' } };

    case 'cancelFailed':
      if (state.kind !== 'canceling') return episode;
      return {
        episodeId,
        state: { kind: 'cancelError', message: event.message },
      };
  }
}
