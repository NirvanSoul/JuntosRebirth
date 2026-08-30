import { apiClient } from '@/services/api/juntossApiClient';
import { listRemoteSpaces } from '@/services/api/spaces';

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

export function createJuntossInvitationGateway(): InvitationGateway {
  return {
    async createCoupleSpaceInvitation(name, currency, inviteeEmail) {
      const space = await apiClient.post<{ data: { space: { id: string } } }>(
        '/v1/spaces',
        { name, type: 'couple', currency, timezone: 'UTC' },
      );
      const invitation = await apiClient.post<{
        data: { invitation: { id: string; expiresAt: string } };
      }>(`/v1/spaces/${space.data.space.id}/invitations`, {
        email: inviteeEmail,
        role: 'member',
      });
      return {
        spaceId: space.data.space.id,
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
      const response = await apiClient.post<{ data: { spaceId: string } }>(
        `/v1/invitations/${invitationId}/accept`,
        {},
      );
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
      const response = await apiClient.post<{ data: { spaceId: string } }>(
        '/v1/invitations/accept',
        { token },
      );
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
