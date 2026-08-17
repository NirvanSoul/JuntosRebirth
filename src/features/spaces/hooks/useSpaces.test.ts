import type { Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAuthSession } from '@/features/auth/hooks/useAuthSession';
import type { InvitationGateway } from '@/features/spaces/gateways/supabaseInvitationGateway';
import { createSupabaseInvitationGateway } from '@/features/spaces/gateways/supabaseInvitationGateway';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import {
  createSpaceId,
  loadSpaces,
  saveSpaces,
} from '@/features/spaces/repositories/localSpaceRepository';
import { personalSpace, type Space } from '@/features/spaces/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';
import { loadCurrencyPreferences } from '@/state/appPreferences/currencyPreferencesRepository';

jest.mock('@/features/auth/hooks/useAuthSession');
jest.mock('@/features/spaces/gateways/supabaseInvitationGateway');
jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/lib/supabase/supabaseClient');
jest.mock('@/state/appPreferences/currencyPreferencesRepository');

const fakeSession = {
  user: { id: 'user-1', email: 'a@b.com' },
} as unknown as Session;

function sessionFor(userId: string): Session {
  return { user: { id: userId, email: 'a@b.com' } } as unknown as Session;
}

function mockAuthSession(session: Session | null) {
  jest.mocked(useAuthSession).mockReturnValue({
    isReady: true,
    session,
    userId: session?.user.id ?? null,
  });
}

function mockRemoteCoupleSpace(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle,
  };
  jest.mocked(getConfiguredSupabaseClient).mockReturnValue({
    from: jest.fn().mockReturnValue(builder),
  } as unknown as ReturnType<typeof getConfiguredSupabaseClient>);
  return builder;
}

function createGatewayStub(
  overrides: Partial<InvitationGateway> = {},
): InvitationGateway {
  return {
    acceptInvitation: jest.fn(),
    createCoupleSpace: jest.fn(),
    createInvitation: jest.fn(),
    dissolveCoupleSpace: jest.fn(),
    getCurrentUserPendingInvitation: jest.fn(),
    getInvitationPreview: jest.fn(),
    getOutgoingInvitation: jest.fn(),
    acceptCurrentUserInvitation: jest.fn(),
    ...overrides,
  };
}

describe('useSpaces (espacio de pareja y multidivisa)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(saveSpaces).mockResolvedValue(undefined);
    jest.mocked(createSpaceId).mockReturnValue('space-generated');
    jest
      .mocked(createSupabaseInvitationGateway)
      .mockReturnValue(createGatewayStub());
    jest.mocked(loadCurrencyPreferences).mockResolvedValue({
      currencies: ['EUR'],
    });
  });

  it('no comprueba el espacio de pareja remoto sin sesión activa', async () => {
    mockAuthSession(null);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(getConfiguredSupabaseClient).not.toHaveBeenCalled();
    expect(result.current.spaces).toEqual([personalSpace]);
  });

  it('fusiona un espacio de pareja remoto nuevo en el catálogo local y lo persiste', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    mockRemoteCoupleSpace({
      data: {
        id: 'space-remote',
        name: 'Juntos',
        type: 'couple',
        currency: 'EUR',
        activated_at: '2026-08-01T10:00:00.000Z',
      },
      error: null,
    });

    const remoteCoupleSpace: Space = {
      id: 'space-remote',
      name: 'Juntos',
      type: 'couple',
      currency: 'EUR',
      isAwaitingPartner: false,
    };

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() =>
      expect(result.current.spaces).toEqual([personalSpace, remoteCoupleSpace]),
    );
    expect(saveSpaces).toHaveBeenCalledWith({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace, remoteCoupleSpace],
    });
  });

  it('marca el espacio de pareja como pendiente mientras la otra persona no acepta', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    mockRemoteCoupleSpace({
      data: {
        id: 'space-remote',
        name: 'Juntos',
        type: 'couple',
        currency: 'EUR',
        activated_at: null,
      },
      error: null,
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() =>
      expect(result.current.spaces).toEqual([
        personalSpace,
        {
          id: 'space-remote',
          name: 'Juntos',
          type: 'couple',
          currency: 'EUR',
          isAwaitingPartner: true,
        },
      ]),
    );
  });

  it('deja de marcar el espacio como pendiente en cuanto el servidor lo activa', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: 'space-remote',
      spaces: [
        personalSpace,
        {
          id: 'space-remote',
          name: 'Juntos',
          type: 'couple' as const,
          currency: 'EUR',
          isAwaitingPartner: true,
        },
      ],
    });
    mockRemoteCoupleSpace({
      data: {
        id: 'space-remote',
        name: 'Juntos',
        type: 'couple',
        currency: 'EUR',
        activated_at: '2026-08-15T09:00:00.000Z',
      },
      error: null,
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() =>
      expect(result.current.activeSpace.isAwaitingPartner).toBe(false),
    );
  });

  it('retira una entrada local de pareja obsoleta cuando ya no existe remotamente, y cae a Personal si era la activa', async () => {
    mockAuthSession(fakeSession);
    const staleCoupleSpace: Space = {
      id: 'space-stale',
      name: 'Juntos',
      type: 'couple' as const,
      currency: 'EUR',
    };
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: staleCoupleSpace.id,
      spaces: [personalSpace, staleCoupleSpace],
    });
    mockRemoteCoupleSpace({ data: null, error: null });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() => expect(result.current.spaces).toEqual([personalSpace]));
    expect(result.current.activeSpace.id).toBe(personalSpace.id);
    expect(saveSpaces).toHaveBeenCalledWith({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
  });

  it('no vuelve a guardar cuando el espacio de pareja remoto ya coincide con el local', async () => {
    mockAuthSession(fakeSession);
    const coupleSpace: Space = {
      id: 'space-remote',
      name: 'Juntos',
      type: 'couple' as const,
      currency: 'EUR',
    };
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: coupleSpace.id,
      spaces: [personalSpace, coupleSpace],
    });
    mockRemoteCoupleSpace({ data: coupleSpace, error: null });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    await waitFor(() => expect(getConfiguredSupabaseClient).toHaveBeenCalled());

    expect(saveSpaces).not.toHaveBeenCalled();
  });

  it('createCoupleSpace exige sesión activa antes de llamar al gateway', async () => {
    mockAuthSession(null);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    const gateway = createGatewayStub();
    jest.mocked(createSupabaseInvitationGateway).mockReturnValue(gateway);

    const { result } = await renderHook(() => useSpaces());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await expect(result.current.createCoupleSpace()).rejects.toThrow(
      'Inicia sesión',
    );
    expect(gateway.createCoupleSpace).not.toHaveBeenCalled();
  });

  it('createCoupleSpace añade el espacio devuelto por el gateway enviando la moneda de preferencias', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadCurrencyPreferences).mockResolvedValue({
      currencies: ['VES'],
    });
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [{ ...personalSpace, currency: 'VES' }],
    });
    mockRemoteCoupleSpace({ data: null, error: null });
    const gateway = createGatewayStub({
      createCoupleSpace: jest.fn().mockResolvedValue({ spaceId: 'space-new' }),
    });
    jest.mocked(createSupabaseInvitationGateway).mockReturnValue(gateway);

    const { result } = await renderHook(() => useSpaces());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => {
      await result.current.createCoupleSpace('Nuestro espacio');
    });

    expect(gateway.createCoupleSpace).toHaveBeenCalledWith(
      'Nuestro espacio',
      'VES',
    );
    // Nace pendiente: no es un espacio usable hasta que la otra persona entre.
    expect(result.current.activeSpace).toEqual({
      id: 'space-new',
      name: 'Nuestro espacio',
      type: 'couple',
      currency: 'VES',
      isAwaitingPartner: true,
    });
  });

  it('createSpace crea un espacio local con la moneda de preferencias', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadCurrencyPreferences).mockResolvedValue({
      currencies: ['USD'],
    });
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });

    const { result } = await renderHook(() => useSpaces());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    let created: Space | undefined;
    await act(async () => {
      created = await result.current.createSpace('Viaje');
    });

    expect(created).toEqual({
      id: 'space-generated',
      name: 'Viaje',
      type: 'other',
      currency: 'USD',
    });
  });

  it('persiste el espacio como VES al recibir una invitación a un espacio VES aunque el receptor tenga preferencias en EUR', async () => {
    mockAuthSession(fakeSession);
    // Receptor tiene preferencias EUR
    jest.mocked(loadCurrencyPreferences).mockResolvedValue({
      currencies: ['EUR'],
    });
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    // Servidor devuelve espacio de pareja en VES (creado por la pareja en Venezuela)
    mockRemoteCoupleSpace({
      data: {
        id: 'space-ves',
        name: 'Juntos VES',
        type: 'couple',
        currency: 'VES',
        activated_at: '2026-08-16T12:00:00.000Z',
      },
      error: null,
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() => {
      const couple = result.current.spaces.find((s) => s.id === 'space-ves');
      expect(couple).toBeDefined();
      expect(couple?.currency).toBe('VES');
    });

    expect(saveSpaces).toHaveBeenCalledWith({
      activeSpaceId: personalSpace.id,
      spaces: [
        personalSpace,
        {
          id: 'space-ves',
          name: 'Juntos VES',
          type: 'couple',
          currency: 'VES',
          isAwaitingPartner: false,
        },
      ],
    });
  });

  it('registra error estructurado en console.error y fija el estado de error cuando el espacio remoto devuelve una moneda corrupta', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockAuthSession(fakeSession);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    mockRemoteCoupleSpace({
      data: {
        id: 'space-corrupted',
        name: 'Juntos Corrupto',
        type: 'couple',
        currency: 'NOT_A_CURRENCY',
        activated_at: null,
      },
      error: null,
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useSpaces] Error de integridad en espacio remoto:',
        expect.any(Error),
      );
      expect(result.current.error).toBe(
        'No pudimos comprobar tu espacio de pareja por un error de integridad.',
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('dissolveCoupleSpace elimina la entrada local y cae a Personal si era la activa', async () => {
    mockAuthSession(fakeSession);
    const coupleSpace: Space = {
      id: 'space-remote',
      name: 'Juntos',
      type: 'couple' as const,
      currency: 'EUR',
    };
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: coupleSpace.id,
      spaces: [personalSpace, coupleSpace],
    });
    mockRemoteCoupleSpace({ data: coupleSpace, error: null });
    const gateway = createGatewayStub({
      dissolveCoupleSpace: jest.fn().mockResolvedValue(undefined),
    });
    jest.mocked(createSupabaseInvitationGateway).mockReturnValue(gateway);

    const { result } = await renderHook(() => useSpaces());
    await waitFor(() =>
      expect(result.current.spaces).toEqual([personalSpace, coupleSpace]),
    );

    await act(async () => {
      await result.current.dissolveCoupleSpace();
    });

    expect(gateway.dissolveCoupleSpace).toHaveBeenCalledWith('space-remote');
    expect(result.current.spaces).toEqual([personalSpace]);
    expect(result.current.activeSpace.id).toBe(personalSpace.id);
  });

  it('no repite la consulta remota cuando cambia la sesión pero no el usuario', async () => {
    mockAuthSession(sessionFor('user-1'));
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    const builder = mockRemoteCoupleSpace({ data: null, error: null });

    const { rerender } = await renderHook(() => useSpaces());
    await waitFor(() => expect(builder.maybeSingle).toHaveBeenCalledTimes(1));

    // Mismo usuario con un token nuevo (objeto de sesión distinto): no debe
    // volver a consultar el espacio de pareja.
    mockAuthSession(sessionFor('user-1'));
    await rerender(undefined);

    expect(builder.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('vuelve a consultar el espacio de pareja cuando cambia el usuario', async () => {
    mockAuthSession(sessionFor('user-1'));
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    const builder = mockRemoteCoupleSpace({ data: null, error: null });

    const { rerender } = await renderHook(() => useSpaces());
    await waitFor(() => expect(builder.maybeSingle).toHaveBeenCalledTimes(1));

    mockAuthSession(sessionFor('user-2'));
    await rerender(undefined);

    await waitFor(() => expect(builder.maybeSingle).toHaveBeenCalledTimes(2));
  });

  it('conserva la referencia de refreshCoupleSpace cuando cambia la sesión pero no el usuario', async () => {
    mockAuthSession(sessionFor('user-1'));
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
    });
    mockRemoteCoupleSpace({ data: null, error: null });

    const { result, rerender } = await renderHook(() => useSpaces());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const firstReference = result.current.refreshCoupleSpace;

    // Mismo usuario, nuevo objeto de sesión: la referencia no debe cambiar.
    mockAuthSession(sessionFor('user-1'));
    await rerender(undefined);

    expect(result.current.refreshCoupleSpace).toBe(firstReference);
  });
});
