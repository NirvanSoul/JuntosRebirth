import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AcceptInvitationError,
  createSupabaseInvitationGateway,
} from '@/features/spaces/gateways/supabaseInvitationGateway';

function createFakeClient(
  overrides: {
    rpc?: jest.Mock;
    functionsInvoke?: jest.Mock;
  } = {},
) {
  return {
    rpc: overrides.rpc ?? jest.fn(),
    functions: {
      invoke: overrides.functionsInvoke ?? jest.fn(),
    },
  } as unknown as SupabaseClient;
}

describe('supabaseInvitationGateway', () => {
  describe('createCoupleSpace', () => {
    it('devuelve el spaceId cuando el RPC resuelve con éxito', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: 'space-1', error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.createCoupleSpace('Juntos')).resolves.toEqual({
        spaceId: 'space-1',
      });
      expect(rpc).toHaveBeenCalledWith('create_couple_space', {
        p_name: 'Juntos',
        p_currency: undefined,
      });
    });

    it('separa el código del mensaje en español cuando el RPC falla', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message:
            'already_in_couple_space: ya perteneces a un espacio juntos activo',
        },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.createCoupleSpace()).rejects.toThrow(
        'ya perteneces a un espacio juntos activo',
      );
    });
  });

  describe('createInvitation', () => {
    it('desempaqueta la fila devuelta por la función de tabla', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            plaintext_token: 'token-abc',
            expires_at: '2026-08-15T00:00:00Z',
          },
        ],
        error: null,
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(
        gateway.createInvitation('space-1', 'pareja@example.com'),
      ).resolves.toEqual({
        id: 'inv-1',
        plaintextToken: 'token-abc',
        expiresAt: '2026-08-15T00:00:00Z',
      });
      expect(rpc).toHaveBeenCalledWith('create_space_invitation', {
        p_space_id: 'space-1',
        p_invitee_email: 'pareja@example.com',
      });
    });

    it('cae en el mensaje genérico si la fila devuelta no trae lo esperado', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.createInvitation('space-1')).rejects.toThrow(
        'No pudimos crear la invitación.',
      );
    });
  });

  describe('getInvitationPreview', () => {
    it('propaga un estado terminal tal cual', async () => {
      const rpc = jest
        .fn()
        .mockResolvedValue({ data: { status: 'expired' }, error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.getInvitationPreview('token')).resolves.toEqual({
        status: 'expired',
      });
    });

    it('devuelve los datos completos cuando está pendiente', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: {
          status: 'pending',
          spaceName: 'Juntos',
          inviterDisplayName: 'Ale',
          invitedEmailMasked: 'f***@gmail.com',
        },
        error: null,
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.getInvitationPreview('token')).resolves.toEqual({
        status: 'pending',
        spaceName: 'Juntos',
        inviterDisplayName: 'Ale',
        invitedEmailMasked: 'f***@gmail.com',
      });
    });
  });

  describe('acceptInvitation', () => {
    it('resuelve con spaceId y spaceName cuando acepta con éxito', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: { spaceId: 'space-1', spaceName: 'Juntos' },
        error: null,
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.acceptInvitation('token')).resolves.toEqual({
        spaceId: 'space-1',
        spaceName: 'Juntos',
      });
    });

    it('lanza AcceptInvitationError con el código conocido separado del mensaje', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message:
            'invitation_wrong_email: esta invitación es para otra dirección de correo',
        },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      const rejection = gateway.acceptInvitation('token');
      await expect(rejection).rejects.toBeInstanceOf(AcceptInvitationError);
      await expect(rejection).rejects.toMatchObject({
        code: 'invitation_wrong_email',
        message: 'esta invitación es para otra dirección de correo',
      });
    });

    it('usa el código "unknown" cuando el prefijo no es uno reconocido', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'not_space_owner: solo un anfitrión puede invitar' },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.acceptInvitation('token')).rejects.toMatchObject({
        code: 'unknown',
      });
    });
  });

  describe('dissolveCoupleSpace', () => {
    it('no lanza cuando el RPC resuelve sin error', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(
        gateway.dissolveCoupleSpace('space-1'),
      ).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledWith('dissolve_couple_space', {
        p_space_id: 'space-1',
      });
    });

    it('separa el código del mensaje en español cuando falla', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'not_space_owner: solo un anfitrión puede eliminarlo',
        },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.dissolveCoupleSpace('space-1')).rejects.toThrow(
        'solo un anfitrión puede eliminarlo',
      );
    });
  });
});
