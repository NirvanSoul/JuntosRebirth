import type { Session } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react-native';

import { usePasswordRecoveryFlow } from '@/features/auth/recovery/usePasswordRecoveryFlow';

const mockSetNewPassword = jest.fn();
jest.mock('@/features/auth/services/resetPasswordService', () => ({
  setNewPassword: (password: string) => mockSetNewPassword(password),
}));

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({
    getSession: mockGetSession,
    signOut: mockSignOut,
  }),
}));

/** Sesión que `getSession` reporta cuando el `signOut` no la eliminó. */
const recoverySession = {
  user: { id: 'user-1' },
} as unknown as Session;

const mockSetRecoveryHold = jest.fn();
jest.mock('@/features/legal/hooks/useLegalSessionGate', () => ({
  useRecoveryHold: () => mockSetRecoveryHold,
}));

/** Último valor de la concesión de pausa, ignorando el identificador de dueño. */
function lastHold(): boolean | undefined {
  const calls = mockSetRecoveryHold.mock.calls;
  return calls.length === 0 ? undefined : calls[calls.length - 1][1];
}

/** Todos los valores de pausa publicados, en orden. */
function holdSequence(): boolean[] {
  return mockSetRecoveryHold.mock.calls.map((call) => call[1] as boolean);
}

/** Promesa que la prueba resuelve o rechaza cuando quiere. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

async function renderFlow() {
  const onCompleted = jest.fn();
  const onCanceled = jest.fn();
  const view = await renderHook(() =>
    usePasswordRecoveryFlow({ onCanceled, onCompleted }),
  );
  return { onCanceled, onCompleted, ...view };
}

/** Lleva el episodio hasta `ready`: código pedido, enviado y verificado. */
async function arriveAtReady(result: {
  current: ReturnType<typeof usePasswordRecoveryFlow>;
}) {
  await act(async () => result.current.start());
  await act(async () => result.current.codeSent());
  await act(async () => result.current.codeVerified());
  expect(result.current.state.kind).toBe('ready');
}

describe('usePasswordRecoveryFlow — el controlador es dueño de las dos operaciones', () => {
  beforeEach(() => {
    mockSetNewPassword.mockReset();
    mockSetNewPassword.mockResolvedValue(undefined);
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
    mockSetRecoveryHold.mockReset();
  });

  it('guardar con éxito: un solo destino de terminación y ninguno de cancelación', async () => {
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestSave('contraseñaNueva1'));

    expect(mockSetNewPassword).toHaveBeenCalledWith('contraseñaNueva1');
    expect(result.current.state.kind).toBe('completed');
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCanceled).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('cancelar tras verificar: cierra la sesión en local y ejecuta un solo destino', async () => {
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());

    expect(mockSignOut).toHaveBeenCalledWith('local');
    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('cancelar antes de verificar no cierra ninguna sesión: no hay ninguna que cerrar', async () => {
    const { onCanceled, result } = await renderFlow();
    await act(async () => result.current.start());
    await act(async () => result.current.codeSent());

    await act(async () => result.current.requestCancel());

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
  });

  // ─── Los dos órdenes de las dos asíncronas ───────────────────────────────

  it('orden A — con el guardado en vuelo, cancelar NO abre un signOut ni cambia el episodio', async () => {
    const save = deferred();
    mockSetNewPassword.mockReturnValue(save.promise);
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestSave('contraseñaNueva1'));
    expect(result.current.state.kind).toBe('saving');
    expect(result.current.canCancel).toBe(false);

    // Aquí es donde antes nacían B13 y B14. Ahora la petición se rechaza.
    await act(async () => result.current.requestCancel());
    expect(result.current.state.kind).toBe('saving');
    expect(mockSignOut).not.toHaveBeenCalled();

    await act(async () => {
      save.resolve();
      await save.promise;
    });

    expect(result.current.state.kind).toBe('completed');
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCanceled).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('orden B — con la cancelación en vuelo, guardar NO llama a setNewPassword', async () => {
    const cancel = deferred();
    mockSignOut.mockReturnValue(cancel.promise);
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());
    expect(result.current.state.kind).toBe('canceling');
    expect(result.current.canSave).toBe(false);

    await act(async () => result.current.requestSave('contraseñaNueva1'));
    expect(result.current.state.kind).toBe('canceling');
    expect(mockSetNewPassword).not.toHaveBeenCalled();

    await act(async () => {
      cancel.resolve();
      await cancel.promise;
    });

    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(onCompleted).not.toHaveBeenCalled();
    expect(mockSetNewPassword).not.toHaveBeenCalled();
  });

  // ─── Fallos observables ─────────────────────────────────────────────────

  it('el guardado que falla devuelve el control: mensaje visible, y se puede reintentar o cancelar', async () => {
    mockSetNewPassword.mockRejectedValueOnce(new Error('Contraseña débil.'));
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestSave('corta'));

    expect(result.current.state.kind).toBe('saveError');
    expect(result.current.errorMessage).toBe('Contraseña débil.');
    expect(result.current.canSave).toBe(true);
    expect(result.current.canCancel).toBe(true);
    // Ningún destino todavía: el episodio sigue abierto.
    expect(onCompleted).not.toHaveBeenCalled();
    expect(onCanceled).not.toHaveBeenCalled();
  });

  it('la cancelación que falla sostiene la pausa y solo el reintento cierra el episodio', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Sin conexión.'));
    // El fallo de GoTrue NO eliminó la sesión: `getSession` la sigue viendo.
    mockGetSession.mockResolvedValue(recoverySession);
    const { onCanceled, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());
    expect(result.current.state.kind).toBe('cancelError');
    expect(result.current.errorMessage).toBe('Sin conexión.');
    expect(onCanceled).not.toHaveBeenCalled();
    // La pausa NO cae con la sesión posiblemente viva.
    expect(lastHold()).toBe(true);

    mockSignOut.mockResolvedValue(undefined);
    // El reintento ya cierra: esta vez la sesión desapareció.
    mockGetSession.mockResolvedValue(null);
    await act(async () => result.current.requestCancel());

    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(lastHold()).toBe(false);
  });

  // ─── B15: el desenlace de la cancelación se decide por la postcondición ──

  it('B15: signOut falla pero getSession → null: la cancelación se completa igualmente', async () => {
    mockSignOut.mockRejectedValue(new Error('No pudimos cerrar sesión.'));
    // GoTrue eliminó la sesión local antes de devolver el error.
    mockGetSession.mockResolvedValue(null);
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());

    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(onCompleted).not.toHaveBeenCalled();
    // No hay error visible ni se ofrece reintento sobre una sesión inexistente.
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.canRetryCancel).toBe(false);
  });

  it('B15: signOut resuelve pero getSession sigue viendo la sesión: cancelError, no se asume nada', async () => {
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(recoverySession);
    const { onCanceled, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());

    expect(result.current.state.kind).toBe('cancelError');
    expect(onCanceled).not.toHaveBeenCalled();
  });

  it('B15: getSession falla (estado desconocido): cancelError observable, nunca asumir que se cerró', async () => {
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockRejectedValue(
      new Error('No pudimos recuperar tu sesión.'),
    );
    const { onCanceled, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel());

    expect(result.current.state.kind).toBe('cancelError');
    expect(result.current.errorMessage).toBe('No pudimos recuperar tu sesión.');
    expect(onCanceled).not.toHaveBeenCalled();
  });

  // ─── Pausa legal e identidad del episodio ───────────────────────────────

  it('la pausa vive y muere con el episodio, y ningún terminal la deja colgada', async () => {
    const { result } = await renderFlow();
    await act(async () => result.current.start());
    expect(lastHold()).toBe(true);

    await act(async () => result.current.codeSent());
    await act(async () => result.current.codeVerified());
    expect(lastHold()).toBe(true);

    await act(async () => result.current.requestSave('contraseñaNueva1'));
    expect(lastHold()).toBe(false);
  });

  it('un episodio nuevo tras uno cancelado vuelve a admitir guardado y ejecuta su propio destino', async () => {
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);
    await act(async () => result.current.requestCancel());
    expect(onCanceled).toHaveBeenCalledTimes(1);

    // «Olvidé mi contraseña» otra vez: episodio limpio.
    await arriveAtReady(result);
    await act(async () => result.current.requestSave('contraseñaNueva2'));

    expect(result.current.state.kind).toBe('completed');
    expect(onCompleted).toHaveBeenCalledTimes(1);
    // El destino de cancelación no se repite por el episodio nuevo.
    expect(onCanceled).toHaveBeenCalledTimes(1);
  });

  it('el resultado tardío de un episodio abandonado no reabre ni ensucia el siguiente', async () => {
    const firstSave = deferred();
    mockSetNewPassword.mockReturnValueOnce(firstSave.promise);
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);
    await act(async () => result.current.requestSave('contraseñaNueva1'));
    expect(result.current.state.kind).toBe('saving');

    // El guardado del primer episodio falla y devuelve el control; se cancela.
    await act(async () => {
      firstSave.reject(new Error('Sin red.'));
      await firstSave.promise.catch(() => undefined);
    });
    expect(result.current.state.kind).toBe('saveError');
    await act(async () => result.current.requestCancel());
    expect(onCanceled).toHaveBeenCalledTimes(1);

    // Episodio nuevo; el destino de terminación del anterior nunca ocurrió.
    await arriveAtReady(result);
    expect(result.current.state.kind).toBe('ready');
    expect(onCompleted).not.toHaveBeenCalled();
  });

  // ─── Atomicidad del payload y continuidad de la pausa ────────────────────

  it('dos peticiones de guardado en el mismo tick guardan la contraseña de la que GANÓ', async () => {
    const save = deferred();
    mockSetNewPassword.mockReturnValue(save.promise);
    const { result } = await renderFlow();
    await arriveAtReady(result);

    // Con la contraseña en una ref del controlador, la segunda llamada
    // sobrescribía el payload de la primera aunque el reductor la rechazara.
    await act(async () => {
      result.current.requestSave('primera');
      result.current.requestSave('segunda');
    });

    expect(mockSetNewPassword).toHaveBeenCalledTimes(1);
    expect(mockSetNewPassword).toHaveBeenCalledWith('primera');

    await act(async () => {
      save.resolve();
      await save.promise;
    });
    expect(result.current.state.kind).toBe('completed');
  });

  it('la pausa no cae en ningún momento intermedio entre el inicio y el terminal', async () => {
    const { result } = await renderFlow();

    await act(async () => result.current.start());
    await act(async () => result.current.codeSent());
    await act(async () => result.current.codeVerified());
    await act(async () => result.current.requestSave('contraseñaNueva1'));

    const sequence = holdSequence();
    // Desde que el episodio abre la pausa hasta que llega al terminal: un solo
    // `true` y un solo `false`, sin oscilación. El `false` previo es la
    // publicación de montaje, con el episodio todavía en `inactive`.
    // Con el cleanup dentro del mismo efecto, aquí aparecía un `false` en cada
    // transición: requestingCode → false → verifyingCode → false → ready…
    expect(sequence.slice(sequence.indexOf(true))).toEqual([true, false]);
    expect(result.current.state.kind).toBe('completed');
  });

  it('la concesión de un controlador no la libera otro: cada uno suelta la suya', async () => {
    const first = await renderFlow();
    await act(async () => first.result.current.start());
    const firstOwner = mockSetRecoveryHold.mock.calls.at(-1)?.[0];

    const second = await renderFlow();
    await act(async () => second.result.current.start());
    const secondOwner = mockSetRecoveryHold.mock.calls.at(-1)?.[0];
    expect(secondOwner).not.toBe(firstOwner);

    // Al desmontar el segundo solo libera su propia concesión.
    await act(async () => second.unmount());
    expect(mockSetRecoveryHold).toHaveBeenLastCalledWith(secondOwner, false);
    expect(mockSetRecoveryHold).not.toHaveBeenLastCalledWith(firstOwner, false);
  });

  // ─── Atomicidad de la intención de salida ────────────────────────────────

  /**
   * Gana la primera intención ACEPTADA, no la primera solicitada. El anfitrión
   * no puede decidirlo: su `canCancel` viene del render anterior, así que dentro
   * del mismo tick, tras aceptar un guardado, sigue viendo que puede cancelar.
   * Esa cancelación la rechaza la máquina —correctamente— pero su intención no
   * puede quedar registrada, o ganaría a la cancelación real posterior.
   */
  it('una intención cuya cancelación fue rechazada no gana a la de la cancelación aceptada después', async () => {
    const save = deferred();
    mockSetNewPassword.mockReturnValue(save.promise);
    const { onCanceled, onCompleted, result } = await renderFlow();
    await arriveAtReady(result);

    // Mismo tick: guardar gana, y la salida que llega detrás se rechaza.
    await act(async () => {
      result.current.requestSave('contraseñaNueva1');
      result.current.requestCancel('cerrar-modal');
    });
    expect(result.current.state.kind).toBe('saving');
    expect(mockSignOut).not.toHaveBeenCalled();

    // El guardado falla y devuelve el control.
    await act(async () => {
      save.reject(new Error('Sin red.'));
      await save.promise.catch(() => undefined);
    });
    expect(result.current.state.kind).toBe('saveError');

    // Ahora sí se acepta una cancelación, con OTRO destino.
    await act(async () => result.current.requestCancel('volver-a-login'));

    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    // El destino es el de la cancelación ACEPTADA, no el de la rechazada.
    expect(onCanceled).toHaveBeenCalledWith('volver-a-login');
    expect(onCompleted).not.toHaveBeenCalled();
  });

  it('el reintento tras cancelError conserva la intención con la que se aceptó la cancelación', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Sin conexión.'));
    // El fallo de GoTrue no eliminó la sesión: hay un cancelError real.
    mockGetSession.mockResolvedValue(recoverySession);
    const { onCanceled, result } = await renderFlow();
    await arriveAtReady(result);

    await act(async () => result.current.requestCancel('volver-a-login'));
    expect(result.current.state.kind).toBe('cancelError');

    // El reintento llega desde otro control y con otra etiqueta: no la cambia.
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue(null);
    await act(async () => result.current.requestCancel('cerrar-modal'));

    expect(result.current.state.kind).toBe('canceled');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(onCanceled).toHaveBeenCalledWith('volver-a-login');
  });
});
