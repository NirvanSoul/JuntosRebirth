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
import { personalSpace } from '@/features/spaces/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

jest.mock('@/features/auth/hooks/useAuthSession');
jest.mock('@/features/spaces/gateways/supabaseInvitationGateway');
jest.mock('@/features/spaces/repositories/localSpaceRepository');
jest.mock('@/lib/supabase/supabaseClient');

const fakeSession = {
  user: { id: 'user-1', email: 'a@b.com' },
} as unknown as Session;

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
    acceptCurrentUserInvitation: jest.fn(),
    ...overrides,
  };
}

describe('useSpaces (espacio de pareja)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(saveSpaces).mockResolvedValue(undefined);
    jest.mocked(createSpaceId).mockReturnValue('space-generated');
    jest
      .mocked(createSupabaseInvitationGateway)
      .mockReturnValue(createGatewayStub());
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
      data: { id: 'space-remote', name: 'Juntos', type: 'couple' },
      error: null,
    });

    const { result } = await renderHook(() => useSpaces());

    await waitFor(() =>
      expect(result.current.spaces).toEqual([
        personalSpace,
        { id: 'space-remote', name: 'Juntos', type: 'couple' },
      ]),
    );
    expect(saveSpaces).toHaveBeenCalledWith({
      activeSpaceId: personalSpace.id,
      spaces: [
        personalSpace,
        { id: 'space-remote', name: 'Juntos', type: 'couple' },
      ],
    });
  });

  it('retira una entrada local de pareja obsoleta cuando ya no existe remotamente, y cae a Personal si era la activa', async () => {
    mockAuthSession(fakeSession);
    const staleCoupleSpace = {
      id: 'space-stale',
      name: 'Juntos',
      type: 'couple' as const,
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
    const coupleSpace = {
      id: 'space-remote',
      name: 'Juntos',
      type: 'couple' as const,
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

  it('createCoupleSpace añade el espacio devuelto por el gateway y lo marca activo', async () => {
    mockAuthSession(fakeSession);
    jest.mocked(loadSpaces).mockResolvedValue({
      activeSpaceId: personalSpace.id,
      spaces: [personalSpace],
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

    expect(gateway.createCoupleSpace).toHaveBeenCalledWith('Nuestro espacio');
    expect(result.current.activeSpace).toEqual({
      id: 'space-new',
      name: 'Nuestro espacio',
      type: 'couple',
    });
  });

  it('dissolveCoupleSpace elimina la entrada local y cae a Personal si era la activa', async () => {
    mockAuthSession(fakeSession);
    const coupleSpace = {
      id: 'space-remote',
      name: 'Juntos',
      type: 'couple' as const,
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
});
