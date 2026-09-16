import { createJuntossInvitationGateway } from '@/features/spaces/gateways/juntossInvitationGateway';
import { ApiError } from '@/services/api/client';
import { apiClient } from '@/services/api/juntossApiClient';
import { listRemoteSpaces } from '@/services/api/spaces';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { delete: jest.fn(), get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/services/api/spaces', () => ({
  listRemoteSpaces: jest.fn(async () => []),
}));

const invitationResponse = {
  data: { invitation: { expiresAt: '2026-09-08T10:00:00.000Z', id: 'inv-1' } },
};

function remoteSpace(overrides: Record<string, unknown> = {}) {
  return {
    activatedAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    currency: 'EUR',
    id: 'space-1',
    name: 'Juntos',
    role: 'owner',
    timezone: 'Europe/Madrid',
    type: 'couple' as const,
    ...overrides,
  };
}

describe('createCoupleSpaceInvitation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('envía la zona horaria del dispositivo, no UTC', async () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'America/Caracas' }),
    } as unknown as Intl.DateTimeFormat);
    jest
      .mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { space: { id: 'space-nuevo' } } })
      .mockResolvedValueOnce(invitationResponse);

    await createJuntossInvitationGateway().createCoupleSpaceInvitation(
      'Juntos',
      'EUR',
      'pareja@example.test',
    );

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/v1/spaces', {
      currency: 'EUR',
      name: 'Juntos',
      timezone: 'America/Caracas',
      type: 'couple',
    });
    jest.mocked(Intl.DateTimeFormat).mockRestore();
  });

  it('reutiliza el espacio que quedó esperando pareja en un intento anterior', async () => {
    // Si la invitación falló, el espacio ya existe y el servidor no admite un
    // segundo espacio de pareja: crear otro devolvería `COUPLE_SPACE_LIMIT`.
    jest.mocked(listRemoteSpaces).mockResolvedValueOnce([remoteSpace()]);
    jest.mocked(apiClient.post).mockResolvedValueOnce(invitationResponse);

    const result =
      await createJuntossInvitationGateway().createCoupleSpaceInvitation(
        'Juntos',
        'EUR',
        'pareja@example.test',
      );

    expect(result.spaceId).toBe('space-1');
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/spaces/space-1/invitations',
      { email: 'pareja@example.test', role: 'member' },
    );
  });

  it.each([
    ['activo', { activatedAt: '2026-09-01T11:00:00.000Z' }],
    ['ajeno', { role: 'member' }],
  ])('no crea un segundo espacio cuando el actual es %s', async (_, state) => {
    jest
      .mocked(listRemoteSpaces)
      .mockResolvedValueOnce([
        remoteSpace(state),
        remoteSpace({ id: 'space-personal', type: 'personal' }),
      ]);

    await expect(
      createJuntossInvitationGateway().createCoupleSpaceInvitation(
        'Juntos',
        'EUR',
        'pareja@example.test',
      ),
    ).rejects.toMatchObject({ code: 'already_in_couple_space' });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('traduce el límite devuelto al crear para cubrir dos envíos simultáneos', async () => {
    jest.mocked(apiClient.post).mockRejectedValueOnce(
      new ApiError({
        status: 409,
        code: 'COUPLE_SPACE_LIMIT',
        message: 'You already have an active shared space.',
      }),
    );

    await expect(
      createJuntossInvitationGateway().createCoupleSpaceInvitation(
        'Juntos',
        'EUR',
        'pareja@example.test',
      ),
    ).rejects.toMatchObject({ code: 'already_in_couple_space' });
  });

  it('explica cuando la persona invitada ya tiene espacio de pareja', async () => {
    jest
      .mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { space: { id: 'space-nuevo' } } })
      .mockRejectedValueOnce(
        new ApiError({
          status: 409,
          code: 'COUPLE_SPACE_LIMIT',
          message: 'You already have an active shared space.',
        }),
      );

    await expect(
      createJuntossInvitationGateway().createCoupleSpaceInvitation(
        'Juntos',
        'EUR',
        'pareja@example.test',
      ),
    ).rejects.toMatchObject({ code: 'invitee_already_in_couple_space' });
  });
});

describe('acceptInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('traduce el rechazo de país para que la interfaz pueda abrir Ajustes', async () => {
    jest.mocked(apiClient.post).mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'SPACE_COUNTRY_MISMATCH',
        message: 'No se puede completar la operación por un conflicto.',
      }),
    );

    await expect(
      createJuntossInvitationGateway().acceptInvitation('token-1'),
    ).rejects.toMatchObject({ code: 'space_country_mismatch' });
  });

  it('traduce la guarda única de pareja al aceptar', async () => {
    jest.mocked(apiClient.post).mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'COUPLE_SPACE_LIMIT',
        message: 'You already have an active shared space.',
      }),
    );

    await expect(
      createJuntossInvitationGateway().acceptInvitation('token-1'),
    ).rejects.toMatchObject({ code: 'already_in_couple_space' });
  });
});

describe('revokeInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revoca la invitación pendiente sin usar la salida del espacio', async () => {
    await createJuntossInvitationGateway().revokeInvitation('space-1', 'inv-1');

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/v1/spaces/space-1/invitations/inv-1',
    );
    expect(apiClient.post).not.toHaveBeenCalledWith(
      '/v1/spaces/space-1/members/leave',
      {},
    );
  });
});

describe('rejectCurrentUserInvitation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('llama al endpoint de rechazo con el id de invitación', async () => {
    jest.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

    await createJuntossInvitationGateway().rejectCurrentUserInvitation?.(
      'inv-42',
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/invitations/inv-42/reject',
      {},
    );
  });
});
