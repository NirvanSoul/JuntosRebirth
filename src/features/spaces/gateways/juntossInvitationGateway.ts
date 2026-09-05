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
    readonly code: 'invitee_not_registered' | 'unknown',
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
  acceptCurrentUserInvitation(
    invitationId: string,
  ): Promise<{ spaceId: string; spaceName: string }>;
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

/** El espacio de pareja que este usuario creó y sigue sin aceptar nadie. */
async function findOwnCoupleSpaceAwaitingPartner(): Promise<string | null> {
  const spaces = await listRemoteSpaces();
  const awaitingPartner = spaces.find(
    (space) =>
      space.type === 'couple' &&
      space.role === 'owner' &&
      space.activatedAt === null,
  );
  return awaitingPartner?.id ?? null;
}

async function createCoupleSpace(
  name: string,
  currency: string,
): Promise<string> {
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
}

export function createJuntossInvitationGateway(): InvitationGateway {
  return {
    async createCoupleSpaceInvitation(name, currency, inviteeEmail) {
      // Crear el espacio y crear su invitación son dos peticiones, no una
      // transacción. Si la segunda falla, el espacio ya existe y el servidor
      // solo admite un espacio de pareja activo por persona: el siguiente
      // intento moría con `COUPLE_SPACE_LIMIT` sin salida. Reutilizar el que
      // quedó esperando pareja hace que reintentar funcione. Su nombre y
      // moneda son los del primer intento; el snapshot remoto es la autoridad
      // y los devuelve en la siguiente restauración.
      const spaceId =
        (await findOwnCoupleSpaceAwaitingPartner()) ??
        (await createCoupleSpace(name, currency));
      const invitation = await apiClient.post<{
        data: { invitation: { id: string; expiresAt: string } };
      }>(`/v1/spaces/${spaceId}/invitations`, {
        email: inviteeEmail,
        role: 'member',
      });
      return {
        spaceId,
        invitationId: invitation.data.invitation.id,
        expiresAt: invitation.data.invitation.expiresAt,
      };
    },
    async createInvitation(spaceId, inviteeEmail) {
      const response = await apiClient.post<{
        data: { invitation: { id: string; expiresAt: string } };
      }>(`/v1/spaces/${spaceId}/invitations`, {
        email: inviteeEmail,
        role: 'member',
      });
      return response.data.invitation;
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
          invitations: { email: string; expiresAt: string; status: string }[];
        };
      }>(`/v1/spaces/${spaceId}/invitations`);
      const invitation = response.data.invitations.find(
        (item) => item.status === 'pending',
      );
      return invitation
        ? { inviteeEmail: invitation.email, expiresAt: invitation.expiresAt }
        : null;
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
