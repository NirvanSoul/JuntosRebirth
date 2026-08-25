import type { SupabaseClient } from '@supabase/supabase-js';

import {
  AcceptInvitationError,
  CreateInvitationError,
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
  describe('createCoupleSpaceInvitation', () => {
    it('confirma espacio e invitación con un único RPC y después intenta el push', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [
          {
            space_id: 'space-atomic',
            invitation_id: 'invitation-atomic',
            expires_at: '2026-09-01T00:00:00Z',
          },
        ],
        error: null,
      });
      const functionsInvoke = jest.fn().mockResolvedValue({
        data: { notifiedDevices: 1 },
        error: null,
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ functionsInvoke, rpc }),
      );

      await expect(
        gateway.createCoupleSpaceInvitation(
          'Juntos',
          'EUR',
          'pareja@example.com',
        ),
      ).resolves.toEqual({
        spaceId: 'space-atomic',
        invitationId: 'invitation-atomic',
        expiresAt: '2026-09-01T00:00:00Z',
      });
      expect(rpc).toHaveBeenCalledWith('create_couple_space_invitation', {
        p_name: 'Juntos',
        p_currency: 'EUR',
        p_invitee_email: 'pareja@example.com',
      });
      expect(functionsInvoke).toHaveBeenCalledWith(
        'send-space-invitation-push',
        { body: { invitationId: 'invitation-atomic' } },
      );
    });

    it('no deja avanzar y conserva el código cuando la cuenta no existe', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message:
            'invitee_not_registered: Ese correo aún no tiene una cuenta.',
        },
      });
      const functionsInvoke = jest.fn();
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ functionsInvoke, rpc }),
      );

      await expect(
        gateway.createCoupleSpaceInvitation(
          'Juntos',
          'EUR',
          'nueva@example.com',
        ),
      ).rejects.toMatchObject({
        code: 'invitee_not_registered',
        name: CreateInvitationError.name,
      });
      expect(functionsInvoke).not.toHaveBeenCalled();
    });
  });

  describe('createInvitation', () => {
    it('crea la invitación dirigida y solicita su push', async () => {
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
      const functionsInvoke = jest
        .fn()
        .mockResolvedValue({ data: { notifiedDevices: 1 }, error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ functionsInvoke, rpc }),
      );

      await expect(
        gateway.createInvitation('space-1', 'pareja@example.com'),
      ).resolves.toEqual({
        id: 'inv-1',
        expiresAt: '2026-08-15T00:00:00Z',
      });
      expect(rpc).toHaveBeenCalledWith('create_space_invitation', {
        p_space_id: 'space-1',
        p_invitee_email: 'pareja@example.com',
      });
      expect(functionsInvoke).toHaveBeenCalledWith(
        'send-space-invitation-push',
        { body: { invitationId: 'inv-1' } },
      );
    });

    it('conserva la invitación si el servicio push no está disponible', async () => {
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
      const functionsInvoke = jest.fn().mockRejectedValue(new Error('offline'));
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ functionsInvoke, rpc }),
      );

      await expect(
        gateway.createInvitation('space-1', 'pareja@example.com'),
      ).resolves.toEqual({
        id: 'inv-1',
        expiresAt: '2026-08-15T00:00:00Z',
      });
    });

    it('cae en el mensaje genérico si la fila devuelta no trae lo esperado', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(
        gateway.createInvitation('space-1', 'pareja@example.com'),
      ).rejects.toThrow('No pudimos crear la invitación.');
    });

    it('conserva el código cuando el correo todavía no tiene cuenta', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message:
            'invitee_not_registered: Ese correo aún no tiene una cuenta.',
        },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(
        gateway.createInvitation('space-1', 'nueva@example.com'),
      ).rejects.toMatchObject({
        code: 'invitee_not_registered',
        name: CreateInvitationError.name,
      });
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

  describe('leaveCoupleSpace', () => {
    it('no lanza cuando el RPC resuelve sin error', async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(
        gateway.leaveCoupleSpace('space-1'),
      ).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledWith('leave_couple_space', {
        p_space_id: 'space-1',
      });
    });

    it('separa el código del mensaje en español cuando falla', async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'not_active_space_member: ya no perteneces a este espacio',
        },
      });
      const gateway = createSupabaseInvitationGateway(
        createFakeClient({ rpc }),
      );

      await expect(gateway.leaveCoupleSpace('space-1')).rejects.toThrow(
        'ya no perteneces a este espacio',
      );
    });
  });
});
