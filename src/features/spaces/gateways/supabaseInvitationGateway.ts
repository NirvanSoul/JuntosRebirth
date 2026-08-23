import type { SupabaseClient } from '@supabase/supabase-js';

import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

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

/** La invitación que sigue pendiente en un espacio propio, vista por quien la envió. */
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
  | 'invalid_space'
  | 'space_full'
  | 'already_in_couple_space'
  | 'unknown';

const knownAcceptErrorCodes: readonly AcceptInvitationErrorCode[] = [
  'invitation_not_found',
  'invitation_already_used',
  'invitation_revoked',
  'invitation_expired',
  'invitation_wrong_email',
  'invalid_space',
  'space_full',
  'already_in_couple_space',
];

/** Todo error de `accept_space_invitation` cae aquí, con el código ya separado del mensaje en español para que la UI pueda decidir la copia exacta por caso. */
export class AcceptInvitationError extends Error {
  code: AcceptInvitationErrorCode;

  constructor(code: AcceptInvitationErrorCode, message: string) {
    super(message);
    this.name = 'AcceptInvitationError';
    this.code = code;
  }
}

export type InvitationGateway = {
  createCoupleSpace(
    name: string | undefined,
    currency: CurrencyCode,
  ): Promise<{ spaceId: string }>;
  createInvitation(
    spaceId: string,
    inviteeEmail?: string,
  ): Promise<{ id: string; plaintextToken: string; expiresAt: string }>;
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

/**
 * Todos los RPC de esta feature lanzan errores con la forma
 * `codigo_como_este: mensaje humano en español`. Separa ambas partes; si no
 * hay un prefijo reconocible (p. ej. un error de red genérico de PostgREST),
 * el mensaje completo se trata como texto humano y no se asigna código.
 */
function splitErrorCode(message: string): {
  code: string | null;
  text: string;
} {
  const separatorIndex = message.indexOf(':');
  if (separatorIndex === -1) {
    return { code: null, text: message };
  }
  const code = message.slice(0, separatorIndex).trim();
  const text = message.slice(separatorIndex + 1).trim();
  return { code, text: text.length > 0 ? text : message };
}

function parseInvitationPreview(value: unknown): InvitationPreview {
  const invalid = () =>
    new Error('Supabase devolvió una vista previa de invitación inválida.');

  if (!value || typeof value !== 'object') {
    throw invalid();
  }
  const result = value as Record<string, unknown>;
  const status = result.status;
  if (
    status === 'not_found' ||
    status === 'expired' ||
    status === 'accepted' ||
    status === 'revoked'
  ) {
    return { status };
  }
  if (status === 'pending') {
    if (
      typeof result.spaceName !== 'string' ||
      typeof result.inviterDisplayName !== 'string'
    ) {
      throw invalid();
    }
    return {
      status: 'pending',
      spaceName: result.spaceName,
      inviterDisplayName: result.inviterDisplayName,
      invitedEmailMasked:
        typeof result.invitedEmailMasked === 'string'
          ? result.invitedEmailMasked
          : null,
    };
  }
  throw invalid();
}

function parseAcceptResult(value: unknown): {
  spaceId: string;
  spaceName: string;
} {
  const result = value as Partial<{
    spaceId: string;
    spaceName: string;
  }> | null;
  if (
    !result ||
    typeof result.spaceId !== 'string' ||
    typeof result.spaceName !== 'string'
  ) {
    throw new AcceptInvitationError(
      'unknown',
      'No pudimos aceptar la invitación.',
    );
  }
  return { spaceId: result.spaceId, spaceName: result.spaceName };
}

export function createSupabaseInvitationGateway(
  client: SupabaseClient = getConfiguredSupabaseClient(),
): InvitationGateway {
  return {
    async createCoupleSpace(name, currency) {
      const { data, error } = await client.rpc('create_couple_space', {
        p_name: name,
        p_currency: currency,
      });
      if (error) {
        const { text } = splitErrorCode(error.message);
        throw new Error(text || 'No pudimos crear el espacio de pareja.');
      }
      if (typeof data !== 'string') {
        throw new Error('No pudimos crear el espacio de pareja.');
      }
      return { spaceId: data };
    },

    async createInvitation(spaceId, inviteeEmail) {
      const { data, error } = await client.rpc('create_space_invitation', {
        p_space_id: spaceId,
        p_invitee_email: inviteeEmail ?? null,
      });
      if (error) {
        const { text } = splitErrorCode(error.message);
        throw new Error(text || 'No pudimos crear la invitación.');
      }
      const rows = Array.isArray(data) ? data : data ? [data] : [];
      const row = rows[0] as
        { id: string; plaintext_token: string; expires_at: string } | undefined;
      if (
        !row ||
        typeof row.id !== 'string' ||
        typeof row.plaintext_token !== 'string'
      ) {
        throw new Error('No pudimos crear la invitación.');
      }
      return {
        id: row.id,
        plaintextToken: row.plaintext_token,
        expiresAt: row.expires_at,
      };
    },

    async getCurrentUserPendingInvitation() {
      const { data, error } = await client.rpc(
        'get_current_user_pending_space_invitation',
      );
      if (error) throw new Error('No pudimos comprobar tus invitaciones.');
      if (!data || typeof data !== 'object') return null;
      const result = data as Partial<CurrentUserInvitation>;
      if (
        typeof result.invitationId !== 'string' ||
        typeof result.inviterDisplayName !== 'string' ||
        typeof result.spaceName !== 'string'
      ) {
        throw new Error('No pudimos comprobar tus invitaciones.');
      }
      return result as CurrentUserInvitation;
    },

    /**
     * No necesita RPC: `space_invitations_select_member` ya deja leer las
     * invitaciones del propio espacio (`invited_by = auth.uid()`), y solo se
     * exponen el correo destinatario y la caducidad, que quien invita escribió.
     */
    async getOutgoingInvitation(spaceId) {
      const { data, error } = await client
        .from('space_invitations')
        .select('invitee_email, expires_at')
        .eq('space_id', spaceId)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (error) throw new Error('No pudimos comprobar tu invitación.');
      if (!data || typeof data.expires_at !== 'string') return null;

      return {
        inviteeEmail:
          typeof data.invitee_email === 'string' ? data.invitee_email : null,
        expiresAt: data.expires_at,
      };
    },

    async acceptCurrentUserInvitation(invitationId) {
      const { data, error } = await client.rpc(
        'accept_current_user_space_invitation',
        { p_invitation_id: invitationId },
      );
      if (error) {
        const { code, text } = splitErrorCode(error.message);
        const knownCode = knownAcceptErrorCodes.find(
          (candidate) => candidate === code,
        );
        throw new AcceptInvitationError(
          knownCode ?? 'unknown',
          text || 'No pudimos aceptar la invitación.',
        );
      }
      return parseAcceptResult(data);
    },

    async getInvitationPreview(token) {
      const { data, error } = await client.rpc('get_space_invitation_preview', {
        p_token: token,
      });
      if (error) {
        throw new Error('No pudimos comprobar esta invitación.');
      }
      return parseInvitationPreview(data);
    },

    async acceptInvitation(token) {
      const { data, error } = await client.rpc('accept_space_invitation', {
        p_token: token,
      });
      if (error) {
        const { code, text } = splitErrorCode(error.message);
        const knownCode = knownAcceptErrorCodes.find(
          (candidate) => candidate === code,
        );
        throw new AcceptInvitationError(
          knownCode ?? 'unknown',
          text || 'No pudimos aceptar la invitación.',
        );
      }
      return parseAcceptResult(data);
    },

    async leaveCoupleSpace(spaceId) {
      const { error } = await client.rpc('leave_couple_space', {
        p_space_id: spaceId,
      });
      if (error) {
        const { text } = splitErrorCode(error.message);
        throw new Error(text || 'No pudimos salir del espacio de pareja.');
      }
    },
  };
}
