import {
  canCancel,
  canRetryCancel,
  canSave,
  hasOtpSession,
  initialRecoveryEpisode,
  isLegalGateHalted,
  isTerminal,
  recoveryReducer,
  type RecoveryEpisode,
  type RecoveryEvent,
  type RecoveryState,
} from '@/features/auth/recovery/recoveryMachine';

const episodeId = 7;

/** Un ejemplar de cada estado, para recorrer la matriz completa. */
const states: Record<RecoveryState['kind'], RecoveryState> = {
  inactive: { kind: 'inactive' },
  requestingCode: { kind: 'requestingCode' },
  verifyingCode: { kind: 'verifyingCode' },
  ready: { kind: 'ready' },
  saving: { kind: 'saving', password: 'contraseñaEnVuelo' },
  saveError: { kind: 'saveError', message: 'sin red' },
  canceling: { kind: 'canceling', intent: 'volver' },
  cancelError: { kind: 'cancelError', intent: 'volver', message: 'sin red' },
  completed: { kind: 'completed' },
  canceled: { kind: 'canceled', intent: 'volver' },
};

/** Un ejemplar de cada evento, con el `episodeId` vigente. */
const events: Record<RecoveryEvent['type'], RecoveryEvent> = {
  start: { type: 'start' },
  codeSent: { type: 'codeSent' },
  codeVerified: { type: 'codeVerified' },
  saveRequested: { type: 'saveRequested', password: 'contraseñaNueva' },
  saveSucceeded: { type: 'saveSucceeded', episodeId },
  saveFailed: { type: 'saveFailed', episodeId, message: 'guardado falló' },
  cancelRequested: { type: 'cancelRequested' },
  cancelSucceeded: { type: 'cancelSucceeded', episodeId },
  cancelFailed: { type: 'cancelFailed', episodeId, message: 'cancelar falló' },
};

/**
 * MATRIZ COMPLETA. Cada celda es el `kind` resultante; `null` significa «el
 * evento no aplica y el episodio se devuelve intacto».
 *
 * Escribirla entera es el punto de todo este rediseño: los defectos B10, B12 y
 * B14 fueron celdas que nadie había mirado, no errores de lógica dentro de una
 * celda.
 */
const matrix: Record<
  RecoveryState['kind'],
  Partial<Record<RecoveryEvent['type'], RecoveryState['kind'] | null>>
> = {
  inactive: { start: 'requestingCode' },
  requestingCode: { codeSent: 'verifyingCode', cancelRequested: 'canceled' },
  verifyingCode: { codeVerified: 'ready', cancelRequested: 'canceled' },
  ready: { saveRequested: 'saving', cancelRequested: 'canceling' },
  // Invariante 1: desde `saving`, cancelar se RECHAZA. Aquí muere la carrera.
  saving: { saveSucceeded: 'completed', saveFailed: 'saveError' },
  saveError: { saveRequested: 'saving', cancelRequested: 'canceling' },
  // Invariante 1: desde `canceling`, guardar se RECHAZA.
  canceling: { cancelSucceeded: 'canceled', cancelFailed: 'cancelError' },
  cancelError: { cancelRequested: 'canceling' },
  // Terminales: solo un episodio nuevo los saca de ahí (invariante 3).
  completed: { start: 'requestingCode' },
  canceled: { start: 'requestingCode' },
};

const allStateKinds = Object.keys(states) as RecoveryState['kind'][];
const allEventTypes = Object.keys(events) as RecoveryEvent['type'][];

describe('recoveryMachine — matriz completa de transiciones', () => {
  allStateKinds.forEach((stateKind) => {
    allEventTypes.forEach((eventType) => {
      const expected = matrix[stateKind][eventType] ?? null;
      const label =
        expected === null
          ? `${stateKind} + ${eventType} → sin cambio`
          : `${stateKind} + ${eventType} → ${expected}`;

      it(label, () => {
        const episode: RecoveryEpisode = {
          episodeId,
          state: states[stateKind],
        };

        const next = recoveryReducer(episode, events[eventType]);

        if (expected === null) {
          // Identidad: el llamante distingue «rechazado» de «transición».
          expect(next).toBe(episode);
          return;
        }
        expect(next.state.kind).toBe(expected);
      });
    });
  });
});

describe('recoveryMachine — invariantes', () => {
  it('1: guardar y cancelar nunca están en vuelo a la vez, en ninguno de los dos órdenes', () => {
    // Orden A: guardar primero. Cancelar se rechaza mientras dura.
    const saving = recoveryReducer(
      { episodeId, state: { kind: 'ready' } },
      { type: 'saveRequested', password: 'contraseñaNueva' },
    );
    expect(saving.state.kind).toBe('saving');
    expect(recoveryReducer(saving, { type: 'cancelRequested' })).toBe(saving);

    // Orden B: cancelar primero. Guardar se rechaza mientras dura.
    const canceling = recoveryReducer(
      { episodeId, state: { kind: 'ready' } },
      { type: 'cancelRequested' },
    );
    expect(canceling.state.kind).toBe('canceling');
    expect(
      recoveryReducer(canceling, {
        type: 'saveRequested',
        password: 'contraseñaNueva',
      }),
    ).toBe(canceling);
  });

  it('2: un resultado de otro episodio se ignora y no toca el actual', () => {
    const saving: RecoveryEpisode = { episodeId, state: states.saving };

    // El resultado tardío del episodio anterior (B14 con otra cara).
    const stale = recoveryReducer(saving, {
      type: 'saveSucceeded',
      episodeId: episodeId - 1,
    });
    expect(stale).toBe(saving);

    // El del episodio vigente sí resuelve.
    const fresh = recoveryReducer(saving, { type: 'saveSucceeded', episodeId });
    expect(fresh.state.kind).toBe('completed');
  });

  it('2 bis: `start` incrementa el episodio, de modo que lo anterior queda obsoleto', () => {
    const first = recoveryReducer(initialRecoveryEpisode, { type: 'start' });
    const canceledFirst = recoveryReducer(
      { episodeId: first.episodeId, state: states.canceled },
      { type: 'start' },
    );
    expect(canceledFirst.episodeId).toBe(first.episodeId + 1);
  });

  it('3: un episodio alcanza exactamente un terminal, y los terminales no se mueven salvo con `start`', () => {
    const completed: RecoveryEpisode = {
      episodeId,
      state: { kind: 'completed' },
    };
    // Ni una cancelación ni un resultado tardío reabren un terminal.
    expect(recoveryReducer(completed, { type: 'cancelRequested' })).toBe(
      completed,
    );
    expect(
      recoveryReducer(completed, { type: 'saveSucceeded', episodeId }),
    ).toBe(completed);
    expect(isTerminal(completed.state)).toBe(true);
    expect(isTerminal(states.canceled)).toBe(true);
    expect(isTerminal(states.saving)).toBe(false);
  });

  it('4: la pausa legal cubre todo el episodio y cae solo en los terminales', () => {
    expect(isLegalGateHalted({ kind: 'inactive' })).toBe(false);
    (
      [
        'requestingCode',
        'verifyingCode',
        'ready',
        'saving',
        'saveError',
        'canceling',
        'cancelError',
      ] as const
    ).forEach((kind) => {
      expect(isLegalGateHalted(states[kind])).toBe(true);
    });
    expect(isLegalGateHalted({ kind: 'completed' })).toBe(false);
    expect(isLegalGateHalted(states.canceled)).toBe(false);
  });

  it('5: cancelar antes del OTP no cierra sesión; después del OTP siempre pasa por `canceling`', () => {
    // Sin sesión todavía: abandono directo.
    (['requestingCode', 'verifyingCode'] as const).forEach((kind) => {
      const next = recoveryReducer(
        { episodeId, state: states[kind] },
        { type: 'cancelRequested' },
      );
      expect(next.state.kind).toBe('canceled');
      expect(hasOtpSession(states[kind])).toBe(false);
    });

    // Con sesión: nunca se salta el cierre.
    (['ready', 'saveError'] as const).forEach((kind) => {
      const next = recoveryReducer(
        { episodeId, state: states[kind] },
        { type: 'cancelRequested' },
      );
      expect(next.state.kind).toBe('canceling');
      expect(hasOtpSession(states[kind])).toBe(true);
    });
  });
});

describe('recoveryMachine — permisos que los anfitriones consultan', () => {
  it('bloquea cancelar, y por tanto atrás y cerrar, mientras el guardado está en vuelo', () => {
    expect(canCancel(states.saving)).toBe(false);
    expect(canCancel(states.canceling)).toBe(false);
    expect(canCancel({ kind: 'ready' })).toBe(true);
    expect(canCancel(states.saveError)).toBe(true);
  });

  it('bloquea guardar cuando la cancelación ya decidió el episodio', () => {
    expect(canSave(states.canceling)).toBe(false);
    expect(canSave(states.cancelError)).toBe(false);
    expect(canSave({ kind: 'completed' })).toBe(false);
    expect(canSave({ kind: 'ready' })).toBe(true);
    expect(canSave(states.saveError)).toBe(true);
  });

  it('el reintento de cancelación solo existe desde el fallo observable', () => {
    expect(canRetryCancel(states.cancelError)).toBe(true);
    expect(canRetryCancel(states.canceling)).toBe(false);
    expect(canRetryCancel({ kind: 'ready' })).toBe(false);
  });
});

describe('recoveryMachine — recorridos completos', () => {
  function run(events: RecoveryEvent[], from = initialRecoveryEpisode) {
    return events.reduce(recoveryReducer, from);
  }

  it('camino feliz: pedir código, verificar, guardar y terminar', () => {
    const end = run([
      { type: 'start' },
      { type: 'codeSent' },
      { type: 'codeVerified' },
      { type: 'saveRequested', password: 'contraseñaNueva' },
      { type: 'saveSucceeded', episodeId: 1 },
    ]);
    expect(end.state.kind).toBe('completed');
    expect(isLegalGateHalted(end.state)).toBe(false);
  });

  it('cancelar tras verificar: cierra sesión y termina en `canceled`', () => {
    const end = run([
      { type: 'start' },
      { type: 'codeSent' },
      { type: 'codeVerified' },
      { type: 'cancelRequested' },
      { type: 'cancelSucceeded', episodeId: 1 },
    ]);
    expect(end.state.kind).toBe('canceled');
  });

  it('la cancelación que falla retiene el episodio hasta que el reintento llega a término', () => {
    const failed = run([
      { type: 'start' },
      { type: 'codeSent' },
      { type: 'codeVerified' },
      { type: 'cancelRequested' },
      { type: 'cancelFailed', episodeId: 1, message: 'sin red' },
    ]);
    expect(failed.state.kind).toBe('cancelError');
    // La pausa NO cae con la sesión posiblemente viva.
    expect(isLegalGateHalted(failed.state)).toBe(true);

    const retried = run(
      [{ type: 'cancelRequested' }, { type: 'cancelSucceeded', episodeId: 1 }],
      failed,
    );
    expect(retried.state.kind).toBe('canceled');
    expect(isLegalGateHalted(retried.state)).toBe(false);
  });

  it('un guardado fallido devuelve el control: se puede reintentar o cancelar', () => {
    const failed = run([
      { type: 'start' },
      { type: 'codeSent' },
      { type: 'codeVerified' },
      { type: 'saveRequested', password: 'contraseñaNueva' },
      { type: 'saveFailed', episodeId: 1, message: 'contraseña débil' },
    ]);
    expect(failed.state.kind).toBe('saveError');
    expect(canCancel(failed.state)).toBe(true);
    expect(canSave(failed.state)).toBe(true);
  });

  it('un episodio nuevo tras uno cancelado empieza limpio y con identidad distinta', () => {
    const canceled = run([
      { type: 'start' },
      { type: 'codeSent' },
      { type: 'cancelRequested' },
    ]);
    expect(canceled.state.kind).toBe('canceled');

    const reopened = recoveryReducer(canceled, { type: 'start' });
    expect(reopened.state.kind).toBe('requestingCode');
    expect(reopened.episodeId).toBe(canceled.episodeId + 1);

    // Y el resultado tardío del episodio viejo ya no le afecta.
    expect(
      recoveryReducer(reopened, {
        type: 'cancelSucceeded',
        episodeId: canceled.episodeId,
      }),
    ).toBe(reopened);
  });
});
