import { createJuntossInvitationGateway } from '@/features/spaces/gateways/juntossInvitationGateway';
import { ApiError } from '@/services/api/client';
import { apiClient } from '@/services/api/juntossApiClient';
import { listRemoteSpaces } from '@/services/api/spaces';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
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

  it('no reutiliza un espacio de pareja ya activo ni uno ajeno', async () => {
    jest
      .mocked(listRemoteSpaces)
      .mockResolvedValueOnce([
        remoteSpace({ activatedAt: '2026-09-01T11:00:00.000Z' }),
        remoteSpace({ id: 'space-2', role: 'member' }),
        remoteSpace({ id: 'space-3', type: 'personal' }),
      ]);
    jest
      .mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { space: { id: 'space-nuevo' } } })
      .mockResolvedValueOnce(invitationResponse);

    const result =
      await createJuntossInvitationGateway().createCoupleSpaceInvitation(
        'Juntos',
        'EUR',
        'pareja@example.test',
      );

    expect(result.spaceId).toBe('space-nuevo');
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
});
