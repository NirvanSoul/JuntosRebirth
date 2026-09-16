import { apiClient } from '@/services/api/juntossApiClient';
import { ApiError } from '@/services/api/client';
import { listRemoteSpaces } from '@/services/api/spaces';
import { deviceTimeZone } from '@/utils/deviceTimeZone';

export type InvitationPreview =
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'accepted' }
  | { status: 'revoked' }
  | {
      status: 'pending';
      spaceName: string;
      inviterDisplayName: string;
      invitedEmailMasked: string | null;
    };
export type CurrentUserInvitation = {
  invitationId: string;
  inviterDisplayName: string;
  spaceName: string;
};
export type OutgoingInvitation = {
  id: string;
  inviteeEmail: string | null;
  expiresAt: string;
};
export type AcceptInvitationErrorCode =
  | 'invitation_not_found'
  | 'invitation_already_used'
  | 'invitation_revoked'
  | 'invitation_expired'
  | 'invitation_wrong_email'
  | 'already_in_couple_space'
  | 'invalid_space'
  | 'space_full'
  | 'space_country_mismatch'
  | 'unknown';
export class AcceptInvitationError extends Error {
  constructor(
    readonly code: AcceptInvitationErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export class CreateInvitationError extends Error {
  constructor(
    readonly code:
      | 'already_in_couple_space'
      | 'invitee_already_in_couple_space'
      | 'invitee_not_registered'
      | 'unknown',
    message: string,
  ) {
    super(message);
  }
}
export type InvitationGateway = {
  createCoupleSpaceInvitation(
    name: string,
    currency: string,
    inviteeEmail: string,
  ): Promise<{ spaceId: string; invitationId: string; expiresAt: string }>;
  createInvitation(
    spaceId: string,
    inviteeEmail: string,
  ): Promise<{ id: string; expiresAt: string }>;
  getCurrentUserPendingInvitation(): Promise<CurrentUserInvitation | null>;
  getOutgoingInvitation(spaceId: string): Promise<OutgoingInvitation | null>;
  revokeInvitation(spaceId: string, invitationId: string): Promise<void>;
  acceptCurrentUserInvitation(
    invitationId: string,
  ): Promise<{ spaceId: string; spaceName: string }>;
  rejectCurrentUserInvitation?(invitationId: string): Promise<void>;
  getInvitationPreview(token: string): Promise<InvitationPreview>;
  acceptInvitation(
    token: string,
  ): Promise<{ spaceId: string; spaceName: string }>;
  leaveCoupleSpace(spaceId: string): Promise<void>;
};

type IncomingInvitation = {
  id: string;
  spaceId: string;
  spaceName: string;
  inviterDisplayName: string | null;
  expiresAt: string;
};

function toAcceptInvitationError(caught: unknown): never {
  if (!(caught instanceof ApiError)) throw caught;

  const codeByApiCode: Partial<Record<string, AcceptInvitationErrorCode>> = {
    ALREADY_IN_COUPLE_SPACE: 'already_in_couple_space',
    COUPLE_SPACE_LIMIT: 'already_in_couple_space',
    INVITATION_ALREADY_USED: 'invitation_already_used',
    INVITATION_EXPIRED: 'invitation_expired',
    INVITATION_NOT_FOUND: 'invitation_not_found',
    INVITATION_REVOKED: 'invitation_revoked',
    INVITATION_WRONG_EMAIL: 'invitation_wrong_email',
    INVALID_SPACE: 'invalid_space',
    SPACE_COUNTRY_MISMATCH: 'space_country_mismatch',
    SPACE_FULL: 'space_full',
  };
  throw new AcceptInvitationError(
    codeByApiCode[caught.code] ?? 'unknown',
    caught.message,
  );
}

/**
 * Devuelve el único espacio pendiente reutilizable. Cualquier otra membresía
 * de pareja significa que esta cuenta ya ocupó su único espacio permitido.
 */
async function findOwnCoupleSpaceAwaitingPartner(): Promise<string | null> {
  const spaces = await listRemoteSpaces();
  const coupleSpaces = spaces.filter((space) => space.type === 'couple');
  if (coupleSpaces.length === 0) return null;

  const [current] = coupleSpaces;
  if (
    coupleSpaces.length === 1 &&
    current?.role === 'owner' &&
    current.activatedAt === null
  ) {
    return current.id;
  }

  throw new CreateInvitationError(
    'already_in_couple_space',
    'Ya perteneces a un espacio de pareja. No puedes crear otro.',
  );
}

async function createCoupleSpace(
  name: string,
  currency: string,
): Promise<string> {
  try {
    const space = await apiClient.post<{ data: { space: { id: string } } }>(
      '/v1/spaces',
      {
        name,
        type: 'couple',
        currency,
        // La misma zona que manda `POST /v1/bootstrap`. Con `UTC` fijo, todo
        // cálculo por día del espacio compartido se desplazaba.
        timezone: deviceTimeZone(),
      },
    );
    return space.data.space.id;
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'COUPLE_SPACE_LIMIT') {
      throw new CreateInvitationError(
        'already_in_couple_space',
        'Ya perteneces a un espacio de pareja. No puedes crear otro.',
      );
    }
    throw caught;
  }
}

function rethrowInvitationCreationError(caught: unknown): never {
  if (caught instanceof ApiError && caught.code === 'COUPLE_SPACE_LIMIT') {
    throw new CreateInvitationError(
      'invitee_already_in_couple_space',
      'Esa persona ya pertenece a un espacio de pareja.',
    );
  }
  throw caught;
}

export function createJuntossInvitationGateway(): InvitationGateway {
  return {
    async createCoupleSpaceInvitation(name, currency, inviteeEmail) {
      // Crear el espacio y crear su invitación son dos peticiones, no una
      // transacción. Si la segunda falla, se reutiliza el espacio propio que
      // quedó esperando pareja. Cualquier otra membresía `couple` bloquea la
      // operación antes de intentar crear un segundo espacio.
      const spaceId =
        (await findOwnCoupleSpaceAwaitingPartner()) ??
        (await createCoupleSpace(name, currency));
      let invitation: {
        data: { invitation: { id: string; expiresAt: string } };
      };
      try {
        invitation = await apiClient.post(`/v1/spaces/${spaceId}/invitations`, {
          email: inviteeEmail,
          role: 'member',
        });
      } catch (caught) {
        rethrowInvitationCreationError(caught);
      }
      return {
        spaceId,
        invitationId: invitation.data.invitation.id,
        expiresAt: invitation.data.invitation.expiresAt,
      };
    },
    async createInvitation(spaceId, inviteeEmail) {
      try {
        const response = await apiClient.post<{
          data: { invitation: { id: string; expiresAt: string } };
        }>(`/v1/spaces/${spaceId}/invitations`, {
          email: inviteeEmail,
          role: 'member',
        });
        return response.data.invitation;
      } catch (caught) {
        rethrowInvitationCreationError(caught);
      }
    },
    async getCurrentUserPendingInvitation(): Promise<CurrentUserInvitation | null> {
      const response = await apiClient.get<{
        data: { invitations: IncomingInvitation[] };
      }>('/v1/invitations');
      const invitation = response.data.invitations[0];
      return invitation
        ? {
            invitationId: invitation.id,
            inviterDisplayName: invitation.inviterDisplayName ?? 'Alguien',
            spaceName: invitation.spaceName,
          }
        : null;
    },
    async getOutgoingInvitation(spaceId): Promise<OutgoingInvitation | null> {
      const response = await apiClient.get<{
        data: {
          invitations: {
            id: string;
            email: string;
            expiresAt: string;
            status: string;
          }[];
        };
      }>(`/v1/spaces/${spaceId}/invitations`);
      const invitation = response.data.invitations.find(
        (item) => item.status === 'pending',
      );
      return invitation
        ? {
            id: invitation.id,
            inviteeEmail: invitation.email,
            expiresAt: invitation.expiresAt,
          }
        : null;
    },
    async revokeInvitation(spaceId, invitationId) {
      await apiClient.delete(
        `/v1/spaces/${spaceId}/invitations/${invitationId}`,
      );
    },
    async acceptCurrentUserInvitation(invitationId) {
      let response: { data: { spaceId: string } };
      try {
        response = await apiClient.post<{ data: { spaceId: string } }>(
          `/v1/invitations/${invitationId}/accept`,
          {},
        );
      } catch (caught) {
        toAcceptInvitationError(caught);
      }
      const space = (await listRemoteSpaces()).find(
        (item) => item.id === response.data.spaceId,
      );
      if (!space) throw new Error('No pudimos recuperar el espacio aceptado.');
      return { spaceId: space.id, spaceName: space.name };
    },
    async rejectCurrentUserInvitation(invitationId) {
      await apiClient.post(`/v1/invitations/${invitationId}/reject`, {});
    },
    async getInvitationPreview(token): Promise<InvitationPreview> {
      const response = await apiClient.get<{
        data: { invitation: InvitationPreview };
      }>(`/v1/invitations/preview?token=${encodeURIComponent(token)}`, {
        isPublic: true,
      });
      return response.data.invitation;
    },
    async acceptInvitation(token) {
      let response: { data: { spaceId: string } };
      try {
        response = await apiClient.post<{ data: { spaceId: string } }>(
          '/v1/invitations/accept',
          { token },
        );
      } catch (caught) {
        toAcceptInvitationError(caught);
      }
      const space = (await listRemoteSpaces()).find(
        (item) => item.id === response.data.spaceId,
      );
      if (!space) throw new Error('No pudimos recuperar el espacio aceptado.');
      return { spaceId: space.id, spaceName: space.name };
    },
    async leaveCoupleSpace(spaceId) {
      await apiClient.post(`/v1/spaces/${spaceId}/members/leave`, {});
    },
  };
}
