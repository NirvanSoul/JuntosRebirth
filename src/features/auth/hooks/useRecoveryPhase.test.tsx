import type { Session } from '@supabase/supabase-js';
import { act, renderHook } from '@testing-library/react-native';

import { useRecoveryPhase } from '@/features/auth/hooks/useRecoveryPhase';

const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({
    getSession: mockGetSession,
    signOut: mockSignOut,
  }),
}));

/** Sesión real que `getSession` reporta cuando el `signOut` no la eliminó. */
const recoverySession = {
  user: { id: 'user-1' },
} as unknown as Session;

describe('useRecoveryPhase — contrato de cancelReset y pegajosidad de cancelingCompletion', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
  });

  it('I1: dos cancelReset inmediatos (antes de un render) producen exactamente un signOut y un solo callback', async () => {
    const resolvers: (() => void)[] = [];
    // I1: un resolvedor por llamada a signOut; la prueba resuelve todos los que se
    // hayan abierto para no colgar promesas en el caso rojo
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    expect(result.current.phase.kind).toBe('active');

    // Dos llamadas en el mismo tick, antes de que React alcance a re-renderear:
    // el guard de `canceling` debe leerse de la ref publicada de forma síncrona,
    // no del estado recién pedido (que solo se sincroniza en el render).
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = result.current.cancelReset(onCanceled);
      second = result.current.cancelReset(onCanceled);
    });

    await act(async () => {
      resolvers.forEach((resolve) => resolve());
      await first;
      await second;
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(result.current.phase.kind).toBe('inactive');
  });

  it('B11 contrato: signOut fallido con la sesión realmente presente — la terminación encolada gana (inactive, sin onCanceled)', async () => {
    let rejectSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSignOut = () => reject(new Error('Sin conexión.'));
        }),
    );
    mockGetSession.mockResolvedValue(recoverySession);
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    let cancelPromise: Promise<void> | undefined;
    await act(async () => {
      cancelPromise = result.current.cancelReset(onCanceled);
    });
    await act(async () => {
      result.current.completeRecovery();
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');

    await act(async () => {
      rejectSignOut?.();
      await cancelPromise;
    });

    // GoTrue lanza, pero la sesión sigue viva: gana la terminación real.
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(result.current.phase.kind).toBe('inactive');
    expect(onCanceled).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('B11 contrato: signOut con éxito y sesión ya eliminada — ganó la cancelación aunque hubiera terminación encolada: inactive + onCanceled', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    mockGetSession.mockResolvedValue(null);
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    let cancelPromise: Promise<void> | undefined;
    await act(async () => {
      cancelPromise = result.current.cancelReset(onCanceled);
    });
    await act(async () => {
      result.current.completeRecovery();
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');

    await act(async () => {
      resolveSignOut?.();
      await cancelPromise;
    });

    expect(result.current.phase.kind).toBe('inactive');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('B11 contrato: signOut fallido y sesión tampoco existe — mismo resultado de cancelación: inactive + onCanceled', async () => {
    let rejectSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSignOut = () => reject(new Error('Sin conexión.'));
        }),
    );
    mockGetSession.mockResolvedValue(null);
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    let cancelPromise: Promise<void> | undefined;
    await act(async () => {
      cancelPromise = result.current.cancelReset(onCanceled);
    });
    await act(async () => {
      result.current.completeRecovery();
    });

    await act(async () => {
      rejectSignOut?.();
      await cancelPromise;
    });

    expect(result.current.phase.kind).toBe('inactive');
    expect(onCanceled).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('B11 contrato: estado de sesión desconocido (getSession falla) — cancelError: fallo observable seguro, nunca asumir que vive', async () => {
    let rejectSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSignOut = () => reject(new Error('Sin conexión.'));
        }),
    );
    mockGetSession.mockRejectedValue(
      new Error('No pudimos recuperar tu sesión.'),
    );
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    let cancelPromise: Promise<void> | undefined;
    await act(async () => {
      cancelPromise = result.current.cancelReset(onCanceled);
    });
    await act(async () => {
      result.current.completeRecovery();
    });

    await act(async () => {
      rejectSignOut?.();
      await cancelPromise;
    });

    expect(result.current.phase.kind).toBe('cancelError');
    if (result.current.phase.kind === 'cancelError') {
      expect(result.current.phase.message).toBe(
        'No pudimos recuperar tu sesión.',
      );
    }
    expect(onCanceled).not.toHaveBeenCalled();
  });

  it('B12: cancelingCompletion es pegajosa frente a startRecovery, finishRecovery y cancelReset: un solo signOut', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    mockGetSession.mockResolvedValue(recoverySession);
    const onCanceled = jest.fn();
    const { result } = await renderHook(() => useRecoveryPhase());

    await act(async () => {
      result.current.startRecovery();
    });
    let cancelPromise: Promise<void> | undefined;
    await act(async () => {
      cancelPromise = result.current.cancelReset(onCanceled);
    });
    await act(async () => {
      result.current.completeRecovery();
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');

    // Ningún escritor mueve la fase mientras el signOut está en vuelo con la
    // terminación encolada: si lo hiciera, la resolución tomaría la rama
    // errónea y se perdería la marca encolada.
    await act(async () => {
      result.current.startRecovery();
      result.current.finishRecovery();
      void result.current.cancelReset(onCanceled);
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(onCanceled).not.toHaveBeenCalled();

    await act(async () => {
      resolveSignOut?.();
      await cancelPromise;
    });
    expect(result.current.phase.kind).toBe('inactive');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
