import { act, renderHook } from '@testing-library/react-native';

import { useRecoveryPhase } from '@/features/auth/hooks/useRecoveryPhase';

const mockSignOut = jest.fn();
jest.mock('@/features/auth/gateways/supabaseAuthGateway', () => ({
  createSupabaseAuthGateway: () => ({ signOut: mockSignOut }),
}));

describe('useRecoveryPhase — idempotencia atómica de cancelReset', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
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

  it('B10 contrato: completeRecovery durante canceling encola la terminación y gana sobre el fallo del signOut', async () => {
    const rejecters: (() => void)[] = [];
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejecters.push(() => reject(new Error('Sin conexión.')));
        }),
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

    // Mientras el signOut está en vuelo la terminación se encola; no se
    // descarta y `cancelError` no puede ganar después.
    await act(async () => {
      result.current.completeRecovery?.();
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');
    expect(onCanceled).not.toHaveBeenCalled();

    await act(async () => {
      rejecters.forEach((reject) => reject());
      await cancelPromise;
    });

    expect(result.current.phase.kind).toBe('inactive');
    expect(onCanceled).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('B10 contrato: con signOut con éxito, la terminación encolada publica inactive sin ejecutar onCanceled', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
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
      result.current.completeRecovery?.();
    });
    expect(result.current.phase.kind).toBe('cancelingCompletion');

    await act(async () => {
      resolveSignOut?.();
      await cancelPromise;
    });

    expect(result.current.phase.kind).toBe('inactive');
    expect(onCanceled).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
